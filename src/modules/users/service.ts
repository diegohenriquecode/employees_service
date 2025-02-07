import bcrypt from 'bcryptjs';
import {BarueriConfig} from 'config';
import {compact, isEmpty, isEqual, uniq, uniqWith} from 'lodash';
import {Sector} from 'modules/orgchart/schema';
import OrgChartsService from 'modules/orgchart/service';
import RolesRepository from 'modules/roles/repository';
import {PermissionObjectType} from 'modules/roles/service';

import AccountsRepository from '../accounts/repository';
import {BadRequestError, ForbiddenError, NotFoundError, NotImplemented} from '../errors/errors';
import UsersRepository from './repository';
import {AppUser, OrderByRaw, RelationSector, User, UserProps} from './schema';

export default class UsersService {
    static config(cfg: BarueriConfig, user: User, account: string) {
        return new UsersService(
            UsersRepository.config(cfg, user.id, account),
            AccountsRepository.config(cfg, user.id),
            OrgChartsService.config(cfg, user, account),
            RolesRepository.config(cfg, user.id, account),
            cfg.appClientId,
            user,
            account,
        );
    }

    async retrieve(id: string) {
        return out(await this._retrieve(id));
    }

    async _retrieve(id: string) {
        const user = await this.repository
            .retrieve(id);
        if (!user) {
            throw new NotFoundError();
        }
        return user;
    }

    async findByUsername(username: string) {
        return this.repository
            .findByUsername(username);
    }

    async findVerified(username: string, password: string) {
        const user = await this.repository.findByUsername(username);
        if (!user) {
            return null;
        }
        if (user.disabled) {
            return null;
        }
        if (!(await bcrypt.compare(password, user.password || ''))) {
            return null;
        }
        return {
            ...user,
            password: undefined,
        };
    }

    async countDisabled() {
        return await this.repository.countDisabled({
            $and: [{account: {$eq: this.account}}],
        });
    }

    async create(user: PartialBy<UserProps, 'scopes' | 'client_id'>) {
        await this.checkForMaxUsersLimit(user.account);

        const roles = await this.roles.list(true);
        if (!roles.some(r => r.id === user.roles)) {
            throw new BadRequestError(`Invalid role ${user.roles}`);
        }

        if (user.password) {
            user = {
                ...user,
                password: await bcrypt.hash(user.password, 10),
                change_password: true,
            };
        }

        const sector = await this.orgChartsService.retrieve(user.sector);
        const now = new Date().toISOString();

        const result = await this.repository
            .create({
                ...user,
                sectors: {
                    [sector.id]: {
                        subordinate_to: (await this.orgChartsService.managersSectorFor(sector, false)).id,
                        created_at: now,
                        is_manager: false,
                    },
                },
                scopes: '',
                client_id: this.appClientId,
            });

        return {
            ...result,
            password: undefined,
        };
    }

    async userObjectToPersist(user: PartialBy<UserProps, 'scopes' | 'client_id'>) {
        if (user.password) {
            user = {
                ...user,
                password: await bcrypt.hash(user.password, 10),
                change_password: true,
            };
        }

        const sector = await this.orgChartsService.retrieve(user.sector);
        const now = new Date().toISOString();
        await this.repository.checkUniques('', user);

        return {
            ...user,
            sectors: {
                [sector.id]: {
                    subordinate_to: (await this.orgChartsService.managersSectorFor(sector, false)).id,
                    created_at: now,
                    is_manager: false,
                },
            },
            scopes: '',
            client_id: this.appClientId,
        };
    }

    async createManagerFromObject(user: UserProps, isManager: boolean) {
        const result = await this.repository.create(user);
        if (isManager) {
            await this.orgChartsService.updateSector(user.sector, {manager: result?.id}, false);
        }

        return result;
    }

    async setDisabled(id: string, value: boolean) {
        if (!value) {
            await this.checkForMaxUsersLimit(this.account);
        }

        await this.repository
            .patch(id, 'disabled', value);
    }

    async update(id: string, user: Partial<UserProps>) {
        const current = await this._retrieve(id);

        if (user.sector && user.sector !== current.sector) {

            if (Object.keys(current.sectors).length > 1) {
                throw new NotImplemented();
            }

            const sector = await this.orgChartsService.retrieve(user.sector);

            if (current.sectors[current.sector].is_manager) {
                await this.orgChartsService.updateSector(current.sector, {manager: null}, false);
            }

            user.sectors = {
                [sector.id]: {
                    subordinate_to: (await this.orgChartsService.managersSectorFor(sector, false)).id,
                    created_at: new Date().toISOString(),
                    is_manager: false,
                },
            };
        }

        if (user.roles) {
            const roles = await this.roles.list(true);
            if (!roles.some(r => r.id === user.roles)) {
                throw new BadRequestError(`Invalid role ${user.roles}`);
            }
        }

        if (user.password) {
            user = {
                ...user,
                password: await bcrypt.hash(user.password, 10),
            };
        }

        const result = await this.repository
            .update(current, user);

        return {
            ...result,
            password: undefined,
        };
    }

    async updatePassword(id: string, old_password: string, new_password: string) {
        const user = await this._retrieve(id);
        await this._updatePassword(user, old_password, new_password);
    }

    async updatePasswordByUsername(username: string, old_password: string, new_password: string) {
        const user = await this.findByUsername(username);
        if (!user) {
            throw new NotFoundError();
        }
        await this._updatePassword(user, old_password, new_password);
    }

    private async _updatePassword(user: User, old_password: string, new_password: string) {
        const passwordMatch = await bcrypt.compare(old_password, user.password);
        if (!passwordMatch) {
            throw new BadRequestError('Wrong password');
        }

        await this.update(user.id, {password: new_password, change_password: false});
    }

    async list({page, pageSize, order, orderBy, orderByRaw, managerFirst, search, searchIn, sector, sectors, account, includeDisabled = true, includeSelf = true, includeAdmin = false, subordinate_to}: ListProps) {
        const clauses = [];

        if (search && searchIn && searchIn?.length > 0) {
            clauses.push({
                '$or': searchIn
                    .map((field: string) => ({[field]: {'$like': search}})),
            });
        }

        if (account) {
            clauses.push({'account': {'$eq': account}});
        }

        if (!includeAdmin) {
            clauses.push({'roles': {$ne: 'admin'}});
        }

        const relationsClauses = [];
        if (sector && !subordinate_to) {
            relationsClauses.push({'sector': {'$eq': sector}});
        }

        if (!sector && subordinate_to) {
            relationsClauses.push({'subordinate_to': {'$eq': subordinate_to}});
        }

        if (sectors) {
            relationsClauses.push({'sector': {'$in': sectors}});
        }

        if (!includeSelf) {
            clauses.push({'id': {'$ne': this.user.id}});
        }

        if (!includeDisabled) {
            clauses.push({
                '$or': [
                    {'disabled': {'$ne': true}},
                    {'disabled': {'$eq': null}},
                ],
            });
        }

        const dbQuery = {'$and': clauses};

        const [total, items] = await Promise.all([
            this.repository.count(dbQuery, relationsClauses.length > 0 ? {'$and': relationsClauses} : undefined),
            this.repository.list(dbQuery, {
                ...((page !== undefined && pageSize !== undefined) && {pagination: {page, pageSize}}),
                ...((orderBy) && {ordering: {order, orderBy}}),
                ...((orderByRaw) && {orderingRaw: orderByRaw, managerFirst}),
            }, relationsClauses.length > 0 ? {'$and': relationsClauses} : undefined),
        ]);

        return {
            total,
            items: items.map(out),
            page,
            pageSize,
        };
    }

    async countEnabledByAccount(accountId: string) {
        const clauses = [];
        clauses.push({'account': {'$eq': accountId}});
        clauses.push({
            '$or': [
                {'disabled': {'$ne': true}},
                {'disabled': {'$eq': null}},
            ],
        });

        const dbQuery = {'$and': clauses};

        const count = await this.repository.count(dbQuery, undefined);

        return Number(count);
    }

    async listByIds({searchIn, account}: Partial<ListProps>) {
        const userIds: string[] = compact(uniq(searchIn));
        if (!userIds || userIds.length === 0) {
            return [];
        }

        const clauses = [];
        clauses.push({
            '$or': userIds
                .map((userId: string) => ({'id': {'$like': userId}})),
        });

        clauses.push({'account': {'$eq': account}});

        const dbQuery = {'$and': clauses};

        const items = await this.repository.list(dbQuery);

        return items;
    }
    async listManagers() {

        const relationsClause = {
            '$and': [
                {'is_manager': {'$eq': true}},
            ],
        };

        const usersClause = {
            '$and': [
                {'account': {'$eq': this.account}},
            ],
        };

        return this.repository.listManagers(usersClause, relationsClause);
    }

    async subordinate_to(account: string, sector: string | string[], excludes?: string) {
        const clauses = [
            {'account': {'$eq': account}},
            {'$or': [{'disabled': {'$ne': true}}, {'disabled': {'$eq': null}}]},
        ];

        if (excludes) {
            clauses.push({'id': {'$ne': excludes}});
        }

        const relationsClauses = [];
        if (Array.isArray(sector)) {
            relationsClauses.push({'subordinate_to': {'$in': sector}});
        } else {
            relationsClauses.push({'subordinate_to': {'$eq': sector}});
        }

        const items = await this.repository
            .list({'$and': clauses}, {}, {'$and': relationsClauses});

        return items.map(out);
    }

    async fromSector(account: string, sector: string, excludes?: string) {
        const clauses = [
            {'account': {'$eq': account}},
            {'$or': [{'disabled': {'$ne': true}}, {'disabled': {'$eq': null}}]},
        ];

        if (excludes) {
            clauses.push({'id': {'$ne': excludes}});
        }

        const relationsClauses = [];
        relationsClauses.push({'sector': {'$eq': sector}});

        const items = await this.repository
            .list({'$and': clauses}, {}, {'$and': relationsClauses});

        return items.map(out);
    }

    async getManager({id, sector, sectors}: Pick<User, 'id' | 'sector'> & Partial<Pick<User, 'sectors'>>) {
        let subordinate_to = sectors?.[sector].subordinate_to;
        if (!subordinate_to) {
            const employee = await this.retrieve(id);
            subordinate_to = employee.sectors[sector].subordinate_to;
        }

        const managersSector = await this.orgChartsService
            .retrieve(subordinate_to);

        return managersSector.manager;
    }

    async checkForMaxUsersLimit(account_id: string, neededQuantity?: number) {
        const account = await this.accounts.retrieve(account_id);
        if (!account) {
            throw new NotFoundError(`Conta ${account_id} não encontrada`);
        }

        const count = await this.repository.countDisabled({
            $and: [{account: {$eq: account_id}}],
        });
        const active = count.created - count.disabled;
        if (account.max_users && active >= account.max_users) {
            throw new BadRequestError('Account has reached max active users limit');
        }

        if (account.max_users && neededQuantity && (neededQuantity + active) > account.max_users) {
            throw new BadRequestError('Account will reach max active users limit with this import');
        }
    }

    async removeManagerFromSector(sector: Sector, subordinate_to: string) {
        if (!sector.manager) {
            return;
        }

        const oldManager = await this.repository.retrieve(sector.manager);
        if (!oldManager) {
            throw new NotFoundError('Old manager not found');
        }

        if (!Object.keys(oldManager.sectors).includes(sector.id)) {
            return;
        }

        if (Object.keys(oldManager.sectors).length > 1) {
            await this.repository.delete(oldManager.id, `sectors.${sector.id}`);
            if (oldManager.sector === sector.id) {
                const {[sector.id]: _, ...sectors} = oldManager.sectors;
                await this.repository.patch(oldManager.id, 'sector', UsersService.getOlderRelation(sectors));
            }
        } else {
            await this.repository.patch(oldManager.id, `sectors.${sector.id}`, {
                ...(oldManager.sectors)[sector.id],
                subordinate_to,
                is_manager: false,
            });
        }
    }

    async setAsManager(sector: Sector, subordinate_to: string) {
        if (!sector.manager) {
            return;
        }

        const newManager = await this.repository.retrieve(sector.manager);
        if (!newManager) {
            throw new NotFoundError('New manager not found');
        }

        const newRelation = {
            subordinate_to,
            created_at: newManager.sectors[sector.id]?.created_at || new Date().toISOString(),
            is_manager: true,
        };

        await this.repository.patch(newManager.id, `sectors.${sector.id}`, newRelation);

        const mainSector = UsersService.getOlderRelation({...newManager.sectors, [sector.id]: newRelation});
        if (mainSector !== newManager.sector) {
            await this.repository.patch(newManager.id, 'sector', mainSector);
        }
    }

    async setSubordinateTo(sector: Sector, subordinate_to: string) {
        if (!sector.manager) {
            return;
        }

        await this.repository.patch(sector.manager, `sectors.${sector.id}.subordinate_to`, subordinate_to);
    }

    async updateSubordinateTo(passThrough: string | null, old_subordinate: string, new_subordinate: string, atSectors: string[]) {
        const employees = await this.repository.list(
            {'$and': [{'account': {'$eq': this.account}}]},
            {},
            {'$and': [{'subordinate_to': {'$eq': old_subordinate}}, {'sector': {'$in': atSectors}}]},
        );

        for (const employee of employees) {

            if (passThrough && passThrough === employee.id) {
                continue;
            }

            const currentEmployee = await this.repository.retrieve(employee.id);
            if (!currentEmployee) {
                continue;
            }

            for (const sectorToUpdate of Object.keys(currentEmployee.sectors)) {
                const relation = currentEmployee.sectors[sectorToUpdate];
                if (relation.subordinate_to === old_subordinate && atSectors.includes(sectorToUpdate)) {
                    await this.repository
                        .patch(employee.id, `sectors.${sectorToUpdate}.subordinate_to`, new_subordinate);
                }
            }
        }
    }

    async resolvedEmployees(employees: string[]|undefined, sector: string|undefined, deep: boolean, user: AppUser, permissionRole: PermissionObjectType, includeDisabled = false) {

        let sectors = sector ? [sector] : undefined;

        if (deep && sector) {
            sectors = (await this.orgChartsService.list(sector)).map(d => d.id);
        }

        const mangoQuery = user.ability.mongoQuery(permissionRole, 'list') || {};
        if (!isEmpty(mangoQuery)) {
            mangoQuery.$or = uniqWith(mangoQuery.$or, isEqual);
        }

        const usersFrom = async (sectorsForUsers: string[]) => {
            const {items} = await this.list({sectors: sectorsForUsers, includeDisabled, account: user.account});
            return items.map(u => u.id);
        };

        if (mangoQuery?.$or) {
            const sectorCondition = mangoQuery.$or.find(c => 'sector' in c)?.sector;

            if (sector && !Object.keys(user.sectors).includes(sector) && (!sectorCondition || !sectorCondition.$in.includes(sector))) {
                throw new ForbiddenError();
            }

            const employeeCondition = mangoQuery.$or.find(c => 'employee' in c)?.employee;
            const allEmployees = [
                ...(employeeCondition ? employeeCondition.$in : []),
                ...(sectorCondition ? await usersFrom(sectorCondition.$in) : []),
            ];

            if (employees && !allEmployees.includes(employees[0])) {
                throw new ForbiddenError();
            }

            const visibleEmployees = sectors ? await usersFrom(sectors) : allEmployees;

            return visibleEmployees
                .filter(e => !employees || e === employees[0]);
        } else {
            if (sectors) {
                const visibleEmployees = await usersFrom(sectors);
                return visibleEmployees
                    .filter(id => !employees || id === employees[0]);
            }
            return employees;
        }
    }

    private static getOlderRelation(sectors: RelationSector) {

        const sectorsKeys = Object.keys(sectors);

        let sector = sectorsKeys[0];
        for (const s of sectorsKeys) {
            if (sectors[s].created_at < sectors[sector].created_at) {
                sector = s;
            }
        }

        return sector;
    }

    constructor(
        private repository: UsersRepository,
        private accounts: AccountsRepository,
        private orgChartsService: OrgChartsService,
        private roles: RolesRepository,
        private appClientId: string,
        private user: User,
        private account: string,
    ) { }
}

function out({password, ...user}: User) {
    return user;
}

type ListProps = {
    page?: number,
    pageSize?: number,
    order?: 'ASC' | 'DESC',
    orderBy?: string,
    orderByRaw?: OrderByRaw,
    managerFirst?: boolean,
    search?: string,
    sector?: string,
    sectors?: string[],
    searchIn?: string[],
    account: string,
    includeDisabled?: boolean,
    includeSelf?: boolean,
    deep?: boolean,
    subordinate_to?: string,
    includeAdmin?: boolean,
};
