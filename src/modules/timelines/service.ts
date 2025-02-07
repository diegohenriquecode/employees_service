import {unseenFeatures} from 'api/app/employees/unseen-items/schema';
import omit from 'lodash/omit';
import AccountsService from 'modules/accounts/service';
import RolesService from 'modules/roles/service';
import UnseenItemsService from 'modules/unseen-items/service';
import {AppUser, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import {BarueriConfig} from '../../config';
import TimelinesRepository from './repository';
import {ListTimelineProps} from './schema';

export default class TimelinesService {

    static config(cfg: BarueriConfig, user: string) {
        return new TimelinesService(
            TimelinesRepository.config(cfg, user),
            UnseenItemsService.config(cfg, user),
            user,
            cfg,
        );
    }

    async list(account: string, employee: string, listProps: ListTimelineProps) {
        let filter = {};

        if (listProps.type) {
            filter = {'$and': [{'type': {'$eq': listProps.type}}]};
        } else if (employee === this.user) {
            filter = {'$and': [{'type': {'$ne': 'Evaluation.DecisionMatrix'}}, {'type': {'$ne': 'Evaluation'}}]};
        }

        const {items, next} = await this.repository
            .list(account, employee, listProps, filter);

        if (employee === this.user) {
            await this.unseenItems.readAll(account, employee, unseenFeatures.timeline);
        }

        return {
            items: items
                .map(r => omit(r, ['account', 'employee'])),
            next,
        };
    }

    async create(account: string, employee: string, type: string, source: string, date: string = moment().toISOString(), data: object) {

        const user = await UsersService.config(this.cfg, {id: 'timeline-create'} as User, account)
            .retrieve(employee) as User;
        const currentAccount = await AccountsService.config(this.cfg, 'timeline-create')
            .retrieve(account);

        const resource = RolesService.object('Timeline', {
            employee,
            sector: user.sector,
            type,
        });

        if (user.roles) {
            const rolesService = RolesService.config(this.cfg, {id: this.user} as AppUser, currentAccount);

            const userRules = await rolesService.rules(user as AppUser);
            const ability = rolesService.userAbility(user, userRules);

            const can = await ability
                .can('list', resource);

            if (can) {
                await this.unseenItems.increment(account, employee, unseenFeatures.timeline);
            }
        }

        return this.repository
            .create({
                account,
                employee,
                type,
                id: source,
                date,
                data,
            });
    }

    async removeBySource(account: string, source: string) {
        const items = await this.repository.listByAccountAndId(account, source);

        for (const item of items) {
            await this.repository.remove(item);
        }
    }

    constructor(
        private repository: TimelinesRepository,
        private unseenItems: UnseenItemsService,
        private user: string,
        private cfg: BarueriConfig,
    ) {}
}
