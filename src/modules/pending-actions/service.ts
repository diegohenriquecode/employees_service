import {isEmpty, omit, orderBy} from 'lodash';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import {BarueriConfig} from '../../config';
import PendingActionsRepository from './repository';
import {PendingAction, PendingActionsListArgs, PendingActionsStatus} from './schema';

export default class PendingActionsService {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new PendingActionsService(
            PendingActionsRepository.config(cfg, user),
            UsersService.config(cfg, {id: user} as User, account),
        );
    }

    async list(account: string, employee: string, listProps: PendingActionsListArgs) {
        const {type, status} = listProps;
        const clauses: any[] = [];

        if (!isEmpty(type)) {
            clauses.push({'type': {'$in': type}});
        }

        if (!listProps.includeDisabled) {
            clauses.push({'disabled': {'$ne': true}});
        }

        if (status) {
            const statusFilter = status === PendingActionsStatus.DONE
                ? {'done': {'$eq': true}}
                : {'done': {'$ne': true}};
            clauses.push(statusFilter);
        }

        const query = isEmpty(clauses) ? {} : {'$and': clauses};

        const {items, next} = await this.repository.list(account, employee, query, listProps);

        const result = items.map(r => omit(r, ['account']));

        return {
            items: orderBy(result, ['created_at'], ['desc']),
            next,
        };
    }

    async listByEmployee(account: string, employee: string, listProps: PendingActionsListArgs) {
        if (listProps.pageSize) {
            return this.list(account, employee, listProps);
        }

        let result = await this.repository.listByEmployee(account, employee, listProps.includeDisabled);

        result = result.map(r => omit(r, ['account', 'employee']));
        return orderBy(result, ['created_at'], ['desc']);
    }

    async listBetweenDayRange(account: string, from: number, to: number) {
        const startDate = moment().subtract(from, 'days').toISOString();
        const endDate = moment().subtract(to, 'days').toISOString();
        return await this.repository.listBeforeAndAfter(account, startDate, endDate);
    }

    async create(account: string, employee: string, sector: string, type: string, source: string, date: string = moment().toISOString(), data: object, done = false) {
        const manager = await this.users.getManager({id: employee, sector}) as string;

        return this.repository
            .create({
                account,
                employee,
                sector,
                type,
                id: source,
                date,
                data,
                done,
                manager,
            });
    }

    async setDone(account: string, employee: string, type: string, source: string) {
        const items = await this.repository
            .listByEmployee(account, employee, true);

        const item = items
            .find(i => i.type === type && i.id === source);
        if (!item) {
            return console.warn(`Pending action to ${JSON.stringify({account, employee, type, source})} not found to set done`);
        }

        return this.repository
            .patch(item, 'done', true);
    }

    async setDoneWithAction(action: PendingAction) {
        return this.repository
            .patch(action, 'done', true);
    }

    async delete(account: string, employee: string, type: string, source: string) {
        const items = await this.repository
            .listByEmployee(account, employee, true);

        const item = items
            .find(i => i.type === type && i.id === source);
        if (!item) {
            return console.warn(`Pending action to ${JSON.stringify({account, employee, type, source})} not found to delete`);
        }

        return this.repository
            .delete(item);
    }

    async deleteWithAction(action: PendingAction) {
        return this.repository
            .delete(action);
    }

    async listByTypeAndId(account: string, type: string, id: string) {
        return this.repository.listByTypeAndId(account, type, id);
    }

    async deleteBySource(account: string, source: string) {
        const items = await this.repository.listByAccountAndId(account, source);

        for (const item of items) {
            await this.deleteWithAction(item);
        }
    }

    constructor(
        private repository: PendingActionsRepository,
        private users: UsersService,
    ) {}
}
