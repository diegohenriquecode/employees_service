import config from '../../../config';
import DynamoClient from '../../../utils/dynamo-client';
import OrgChartsService from '../../orgchart/service';
import {User} from '../../users/schema';
import UsersService from '../../users/service';
import PendingActionsRepository from '../repository';
import {PendingAction, PendingActionsTypes} from '../schema';

export async function up(): Promise<void> {
    const {Items} = await documents.scanAll({
        TableName: config.pendingActionsTable,
        FilterExpression: '#employee = #data.#employee AND #type = :type AND #done <> :done',
        ExpressionAttributeNames: {'#employee': 'employee', '#data': 'data', '#type': 'type', '#done': 'done'},
        ExpressionAttributeValues: {':type': PendingActionsTypes.FeedbackPendingApproval, ':done': true},
    });

    for (const action of Items as PendingAction[]) {
        await repository.delete(action);
        const sectors = OrgChartsService.config(config, {id: 'ddb_fix_feedback_approver-migration'} as User, action.account);
        const sector = await sectors.retrieve(action.data.sector, true);
        if (sector.removed) {
            console.warn('Sector is removed');
            continue;
        }
        const managerSector = await sectors.managersSectorFor(sector, sector.manager === action.data.employee);
        if (managerSector.manager) {
            await repository.create({
                ...action,
                employee: managerSector.manager,
                sector: managerSector.id,
                manager: await UsersService.config(config, {id: 'ddb_fix_feedback_approver-migration'} as User, action.account)
                    .getManager({id: managerSector.manager, sector: managerSector.id}),
            });
        } else {
            console.warn('Manager not found');
        }
    }
}

const repository = PendingActionsRepository.config(config, 'ddb_fix_feedback_approver-migration');

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
