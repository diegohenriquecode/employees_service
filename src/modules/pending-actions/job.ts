import {Context, ScheduledEvent} from 'aws-lambda';
import config from 'config';
import AccountsRepository from 'modules/accounts/repository';
import {ConflictError, ErrorsNotification} from 'modules/errors/errors';
import OrgChartsService from 'modules/orgchart/service';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

import {LatePendingAction, NonScalablePendingActionsTypes, PendingAction, PendingActionsTypes} from './schema';
import PendingActionsService from './service';

export async function handler(event: ScheduledEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler();
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
    }
}

async function _handler() {
    const accounts = (await accountsRepository.list())
        .filter(account => !account.disabled)
        .map(account => account.id);

    for (const account of accounts) {
        const pendingActionsService = PendingActionsService.config(config, 'pending-actions-job', account);
        const computedOnes = await pendingActionsService.listBetweenDayRange(account, config.latePeriod, 0);
        const lateOnes = await pendingActionsService.listBetweenDayRange(account, config.latePeriodStart, config.latePeriod);
        const orgChartService = OrgChartsService.config(config, {id: 'pending-action-job'} as User, account);

        for (const pendency of lateOnes) {
            if (lateOnes.some(lateAction => verifyPendencyExistence(lateAction, pendency))) {
                continue;
            }

            if (computedOnes.some(lateAction => verifyPendencyExistence(lateAction, pendency))) {
                continue;
            }

            const newPendency = await latePendingActionFrom(pendency, orgChartService);

            if (!newPendency) {
                continue;
            }

            try {
                await pendingActionsService.create(
                    newPendency.account,
                    newPendency.employee,
                    newPendency.sector,
                    newPendency.type,
                    newPendency.source,
                    newPendency.created_at,
                    newPendency.data,
                );
            } catch (error) {
                if (error instanceof ConflictError) {
                    console.warn('Pending action already exists');
                    continue;
                } else {
                    throw error;
                }

            }
        }
    }
}

function verifyPendencyExistence(lateAction: PendingAction, pendency: PendingAction) {
    return lateAction.id === `${pendency.id}!` && lateAction.data.employee === pendency.employee;
}

export async function latePendingActionFrom(pendency: PendingAction, sectors: OrgChartsService, lax = false): Promise<LatePendingAction | null> {
    if (pendency.type in NonScalablePendingActionsTypes && !lax) {
        return null;
    }

    let sector;
    if (pendency.sector) {
        sector = await sectors.retrieve(pendency.sector, true);
        if (sector.removed) {
            sector = null;
        }
    }
    if (!sector) {
        const employee = await UsersService.config(config, {id: 'pending-action-job'} as User, pendency.account)
            .retrieve(pendency.employee);
        sector = await sectors.retrieve(employee.sector);
    }

    const managerSector = await sectors.managersSectorFor(sector, sector.manager === pendency.employee);
    if (!managerSector.manager) {
        console.warn('Manager not found');
        return null;
    }

    const latePendingId = `${pendency.id}!`;

    if (managerSector.manager === pendency.employee && !lax) {
        console.warn('Employee and manager are the same');
        return null;
    }

    return {
        account: pendency.account,
        employee: managerSector.manager,
        sector: managerSector.id,
        type: PendingActionsTypes.LatePendingActionType,
        source: latePendingId,
        created_at: pendency.created_at,
        data: {
            employee: pendency.employee,
            sector: managerSector.id,
            type: pendency.type,
            since: pendency.created_at,
            index: (pendency.data.index || 0) + 1,
            data: {...pendency.data},
        },
    };
}

const accountsRepository = AccountsRepository.config(config, 'pending-actions-job');
