import {CreateUserSchema} from 'api/app/users/schema';
import {BarueriConfig} from 'config';
import compact from 'lodash/compact';
import {AsyncTasksStatus} from 'modules/async-tasks/schema';
import {unformattedString} from 'modules/async-tasks/utils';
import {BadRequestError, BarueriError, ConflictError, ValidationError} from 'modules/errors/errors';
import {TreeSector} from 'modules/orgchart/schema';
import OrgChartsService from 'modules/orgchart/service';
import {bfsList, leafsList} from 'modules/orgchart/utils';
import {Rank} from 'modules/ranks/schema';
import RanksService from 'modules/ranks/service';
import RolesRepository from 'modules/roles/repository';

import {User} from './schema';
import UsersService from './service';

export const fieldsNameMap = {
    'username': 'USUÁRIO',
    'name': 'FUNCIONARIO',
    'sector': 'SETOR',
    'rank': 'FUNÇÃO',
    'email': 'EMAIL',
    'mobile_phone': 'CELULAR',
    'password': 'SENHA',
    'roles': 'PERFIL',
};

const roleColumn = {
    'employee': 'Colaborador',
    'rh': 'RH',
};

export type UserSheetItem = {
    rowNum: number,
    username: string,
    name: string,
    sector: string,
    rank: string,
    email: string,
    mobile_phone: string,
    password: string,
    roles: string,
    rowStatus: AsyncTasksStatus,
    rowStatusMessage: string,
};

export default class UsersImport {
    static config(cfg: BarueriConfig, user: User, account: string) {
        return new UsersImport(
            UsersService.config(cfg, user, account),
            RanksService.config(cfg, user, account),
            OrgChartsService.config(cfg, user, account),
            RolesRepository.config(cfg, user.id, account),
            account,
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async batchCreateUsers(rows: any[]) {
        const ranks = await this.ranks.list();
        const sectors = await this.sectors.list();

        const roles: Record<string, string> = {};
        (await this.roles.list(true))
            .filter(({id}) => ['rh', 'employee'].includes(id))
            .forEach(({id}) => roles[unformattedString(roleColumn[id as keyof typeof roleColumn])] = id);

        for (const row of rows) {
            if (!row) {
                continue;
            }

            const index = row['__rowNum__'];
            const item = this.convertUserSheetRow(rows[index]);

            if (item.rowStatus === AsyncTasksStatus.DONE) {
                continue;
            }

            try {
                item.roles = this.resolvedRole(roles, item.roles);
                item.rank = this.resolvedRank(ranks, item.rank);

                const sector = sectors.find(s => unformattedString(s.name) === unformattedString(item.sector));
                if (!sector) {
                    throw new BadRequestError('unknown_sector');
                }
                item.sector = sector.id;

                const {rowNum, rowStatus, rowStatusMessage, ...userData} = item;
                try {
                    const result = CreateUserSchema.validate(userData, {abortEarly: false, presence: 'required'});
                    if (result.error) {
                        const details = result.error.details.map(d => d.message);
                        throw new ValidationError('Validation error', details);
                    }

                    const createdUser = await this.service.create({
                        ...result.value,
                        account: this.account,
                        change_password: true,
                        sectors: {},
                    });

                    if (createdUser && createdUser.id) {
                        item.rowStatus = AsyncTasksStatus.DONE;
                        item.rowStatusMessage = createdUser.id;
                    } else {
                        item.rowStatus = AsyncTasksStatus.ERROR;
                        item.rowStatusMessage = 'unexpected_error';
                    }
                } catch (error: ConflictError | unknown) {
                    if (!(error instanceof ConflictError)) {
                        throw error;
                    }

                    switch (error.toJSON().detail) {
                    case 'email already registered':
                        throw new BadRequestError('duplicated_email');
                    case 'phone already registered':
                        throw new BadRequestError('duplicated_phone');
                    case 'username already registered':
                        throw new BadRequestError('duplicated_username');
                    }
                }
            } catch (error: unknown) {
                item.rowStatus = AsyncTasksStatus.ERROR;
                if (error instanceof BadRequestError && error.message === 'Account has reached max active users limit') {
                    item.rowStatusMessage = 'account_max_active_users';
                } else if (error instanceof BadRequestError) {
                    item.rowStatusMessage = error.message;
                } else if (error instanceof ValidationError) {
                    item.rowStatusMessage = 'validation_error: ' + error.details[0];
                } else if (error instanceof BarueriError) {
                    item.rowStatusMessage = 'unexpected_error: ' + error.message;
                } else {
                    item.rowStatusMessage = 'unexpected_error';
                }
            } finally {
                rows[index] = item;
            }
        }

        return rows.map((item: UserSheetItem) => ({
            rowNum: item.rowNum,
            rowStatus: item.rowStatus,
            rowStatusMessage: item.rowStatusMessage,
        }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async batchCreateManagers(rows: any[]) {
        await this.service.checkForMaxUsersLimit(this.account, compact(rows).length);

        const ranks = await this.ranks.list();
        const {tree} = await this.sectors.find('root');

        return this._batchCreateManagers(rows, {ranks, tree});
    }

    private async _batchCreateManagers(rows: any[], {tree, ranks}: {tree: TreeSector, ranks: Rank[]}) {
        let counter = 0;
        const sectors = bfsList(tree);
        const leafs = leafsList(tree);
        for (const row of rows) {
            if (!row) {
                continue;
            }

            const index = row['__rowNum__'];
            const item = this.convertUserSheetRow(rows[index]);

            if (item.rowStatus === AsyncTasksStatus.DONE) {
                continue;
            }

            try {
                item.roles = 'employee';
                item.rank = this.resolvedRank(ranks, 'Analista');

                let sector = sectors[counter];
                if (!sector) {
                    sector = leafs[counter % leafs.length];
                }
                item.sector = sector.id;

                const {rowNum, rowStatus, rowStatusMessage, ...userData} = item;
                const result = CreateUserSchema.validate(userData, {abortEarly: false, presence: 'required'});
                if (result.error) {
                    const details = result.error.details.map(d => d.message);
                    throw new ValidationError('Validation error', details);
                }

                const managerObject = await this.service.userObjectToPersist({
                    ...result.value,
                    account: this.account,
                    change_password: true,
                });

                this.checkUniqueOnRows(rows.slice(2, index), managerObject);

                item.rowStatus = AsyncTasksStatus.PROGRESS;
                item.rowStatusMessage = '';
                rows[index].managerObject = managerObject;
            } catch (error: unknown) {
                item.rowStatus = AsyncTasksStatus.ERROR;
                if (error instanceof BadRequestError) {
                    item.rowStatusMessage = error.message;
                } else if (error instanceof ConflictError) {
                    switch (error.toJSON().detail) {
                    case 'email already registered':
                        item.rowStatusMessage = 'duplicated_email';
                        break;
                    case 'phone already registered':
                        item.rowStatusMessage = 'duplicated_phone';
                        break;
                    case 'username already registered':
                        item.rowStatusMessage = 'duplicated_username';
                        break;
                    }
                } else if (error instanceof ValidationError) {
                    item.rowStatusMessage = 'validation_error: ' + error.details[0];
                } else if (error instanceof BarueriError) {
                    item.rowStatusMessage = 'unexpected_error: ' + error.message;
                } else {
                    item.rowStatusMessage = 'unexpected_error';
                }
            } finally {
                rows[index] = {...item, managerObject: rows[index].managerObject};
                counter++;
            }
        }

        if (rows.some((item: UserSheetItem) => item.rowStatus !== AsyncTasksStatus.PROGRESS)) {
            return rows.map((item: UserSheetItem) => ({
                rowNum: item.rowNum,
                rowStatus: item.rowStatus,
                rowStatusMessage: item.rowStatusMessage,
            }));
        }

        counter = 0;
        for (const row of rows) {
            if (!row) {
                continue;
            }

            const index = row.rowNum;
            try {
                const hasSectorToManage = counter < sectors.length;
                if (hasSectorToManage) {
                    const lastManager = sectors.find(x => x.id === row.managerObject.sector)?.manager;
                    if (lastManager) {
                        const {roles: lastManagerRole, rank: lastManagerRank} = await this.service.retrieve(lastManager);
                        row.managerObject.roles = lastManagerRole;
                        row.managerObject.rank = lastManagerRank;
                    }
                }
                const result = await this.service.createManagerFromObject(row.managerObject, hasSectorToManage);
                if (result && result.id) {
                    row.rowStatus = AsyncTasksStatus.DONE;
                    row.rowStatusMessage = result.id;
                } else {
                    row.rowStatus = AsyncTasksStatus.ERROR;
                    row.rowStatusMessage = 'unexpected_error';
                }
            } catch (error: unknown) {
                row.rowStatus = AsyncTasksStatus.ERROR;
                if (error instanceof BadRequestError) {
                    row.rowStatusMessage = error.message;
                } else if (error instanceof ValidationError) {
                    row.rowStatusMessage = 'validation_error: ' + error.details[0];
                } else if (error instanceof BarueriError) {
                    row.rowStatusMessage = 'unexpected_error: ' + error.message;
                } else {
                    row.rowStatusMessage = 'unexpected_error';
                }
            } finally {
                rows[index] = {...row};
                counter++;
            }
        }

        return rows.map((item: UserSheetItem) => ({
            rowNum: item.rowNum,
            rowStatus: item.rowStatus,
            rowStatusMessage: item.rowStatusMessage,
        }));
    }

    private convertUserSheetRow(rawRow: Record<string, string>) {
        const item: Record<string, string> = {};
        const row: Record<string, string> = {};
        Object.keys(rawRow).forEach(key => {
            row[unformattedString(key)] = rawRow[key];
        });
        Object.entries(fieldsNameMap).forEach(([key, value]) => {
            item[unformattedString(key)] = row[unformattedString(value)]?.toString();
        });

        return {
            rowNum: parseInt(rawRow['__rowNum__']),
            username: item['username'],
            name: item['name'],
            sector: item['sector'],
            rank: item['rank'],
            email: item['email'],
            mobile_phone: item['mobile_phone'],
            password: item['password'],
            roles: item['roles'],
            rowStatus: AsyncTasksStatus.PROGRESS,
            rowStatusMessage: '',
        } as UserSheetItem;
    }

    private resolvedRole(roles: Record<string, string>, itemRoles: string) {
        const role = unformattedString(itemRoles);
        if (!(role in roles)) {
            throw new BadRequestError('unknown_role');
        }
        return roles[role];
    }

    private resolvedRank(ranks: Rank[], itemRank: string) {
        const rank = ranks.find(s => unformattedString(s.title) === unformattedString(itemRank));
        if (!rank) {
            throw new BadRequestError('unknown_rank');
        }
        return rank.id;
    }

    private checkUniqueOnRows(rows: any[], managerObject: Record<string, any>) {
        rows.forEach((row: Record<string, any>) => {
            if (!rows) {
                return;
            }

            if (
                managerObject.username &&
                managerObject.username === row.managerObject?.username
            ) {
                throw new BadRequestError('duplicated_username');
            }

            if (
                managerObject.email &&
                managerObject.email === row.managerObject?.email
            ) {
                throw new BadRequestError('duplicated_email');
            }

            if (
                managerObject.mobile_phone &&
                managerObject.mobile_phone === row.managerObject?.mobile_phone
            ) {
                throw new BadRequestError('duplicated_phone');
            }
        });
    }

    constructor(
        private service: UsersService,
        private ranks: RanksService,
        private sectors: OrgChartsService,
        private roles: RolesRepository,
        private account: string,
    ) { }
}
