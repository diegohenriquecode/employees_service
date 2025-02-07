import {BarueriConfig} from 'config';
import AccountsService from 'modules/accounts/service';
import {AppUser} from 'modules/users/schema';
import moment from 'moment-timezone';
import {v4 as uuidV4} from 'uuid';

import SessionsReportsRepository from './repository';
import {ListSessionsReportsProps, SessionsReports, SessionsReportsGroup} from './schema';

export default class SessionsReportsService {

    static config(cfg: BarueriConfig, user: AppUser) {
        return new SessionsReportsService(
            SessionsReportsRepository.config(cfg, user),
            AccountsService.config(cfg, user.id),
            user,
        );
    }

    async create() {
        const account = await this.accounts.retrieve(this.user.account);
        const date = moment.tz(account.timezone).startOf('day').toISOString();
        return this.repository
            .create({
                date,
                id: uuidV4(),
                employee: this.user.id,
            });
    }

    async countByRange(accountId: string, listProps: ListSessionsReportsProps) {
        await this.accounts.retrieve(accountId);
        const items = await this.repository
            .list(accountId, listProps);

        switch (listProps.groupBy) {
        case SessionsReportsGroup.BY_DAY:
            return {dates: groupByDay(items)};
        case SessionsReportsGroup.BY_MONTH:
            return {dates: groupByMonth(items)};
        default:
            return {};
        }
    }

    async lastVisited(accountId: string) {
        return await this.repository.lastSessionActive(accountId);
    }

    constructor(
        private repository: SessionsReportsRepository,
        private accounts: AccountsService,
        private user: AppUser,
    ) { }
}

const groupByDay = (items: SessionsReports[]) => {
    const dates: Record<string, number> = {};
    items.forEach((i) => {
        dates[i.date] ? dates[i.date]++ : dates[i.date] = 1;
    });
    return dates;
};

const groupByMonth = (items: SessionsReports[]) => {
    const employeesByMonth: Record<string, Record<string, number>> = {};
    items.forEach((i) => {
        const month: string = moment(i.date).format('YYYY-MM');
        employeesByMonth[month] = {...employeesByMonth[month], [i.employee]: 1};
    });

    const dates: Record<string, number> = {};
    Object.entries(employeesByMonth).forEach(([month, employees]) => {
        dates[month] = Object.keys(employees).length;
    });

    return dates;
};
