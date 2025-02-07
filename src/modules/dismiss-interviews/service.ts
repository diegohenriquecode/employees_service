import {DismissInterviewsListArgs} from 'api/app/dismiss-interviews/schema';
import {BarueriConfig} from 'config';
import isEmpty from 'lodash/isEmpty';
import {Account} from 'modules/accounts/schema';
import {ExportReportsType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {getFormattedDateAndHour, mapper} from 'modules/async-tasks/utils';
import EmployeesService from 'modules/employees/service';
import {BadRequestError, ConflictError, NotFoundError} from 'modules/errors/errors';
import {ClausesType} from 'modules/feedbacks/schema';
import OrgChartsService from 'modules/orgchart/service';
import RanksService from 'modules/ranks/service';
import {AppUser} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import DismissInterviewsRepository from './repository';
import DismissInterviewsMysqlRepository from './repository.mysql';
import {CreateDismissInterviewProps} from './schema';

export default class DismissInterviewsService {

    static config(cfg: BarueriConfig, user: AppUser, account: string): DismissInterviewsService {
        return new DismissInterviewsService(
            EmployeesService.config(cfg, user, account),
            DismissInterviewsRepository.config(cfg, user.id, account),
            OrgChartsService.config(cfg, user, account),
            DismissInterviewsMysqlRepository.config(cfg),
            AsyncTasksService.config(cfg, user, account),
            UsersService.config(cfg, user, account),
            RanksService.config(cfg, user, account),
            account,
        );
    }

    async retrieve(id: string, employeeId: string) {
        const dismissInterview = await this.repository.retrieve(id, employeeId);

        if (!dismissInterview) {
            throw new NotFoundError('Dismiss interview not found');
        }

        return dismissInterview;
    }

    async create(employeeId: string, props: CreateDismissInterviewProps) {
        const employee = await this.employeesService.retrieve(employeeId);

        if (employee.hired_at) {
            if (moment(props.dismissed_at).isSameOrBefore(moment(employee.hired_at))) {
                throw new BadRequestError('dismissed_at must be gratter than hired_at');
            }
        }

        const dismissInterviews = await this.repository.listByEmployee(employeeId);

        if (dismissInterviews.length > 0) {
            throw new ConflictError('employee already has a dismiss interview');
        }

        const manager = await this.users.getManager({id: employeeId, sector: employee.sector}) as string;

        await this.employeesService.update(employeeId, {dismissed_at: props.dismissed_at});

        const result = await this.repository.create(employeeId, {
            ...props,
            manager,
        });

        return result;
    }

    async listByEmployee(employeeId: string) {
        const dismissInterviews = await this.repository.listByEmployee(employeeId);

        return dismissInterviews;
    }

    async list(props: DismissInterviewsListArgs) {
        const {sector, from, to} = props;

        const dismissInterviews = await this.repository
            .listByDateRange(from, to);

        if (isEmpty(dismissInterviews)) {
            return [];
        }

        const {items} = await this.users.list({
            sectors: (await this.orgChart.list(sector)).map(s => s.id),
            account: this.account,
            includeDisabled: true,
        });

        return dismissInterviews
            .filter(dismissInterview => items.some(user => user.id === dismissInterview.employee))
            .map(interview => ({
                ...interview,
                employee: items.find(e => e.id === interview.employee),
            }));
    }

    async listReport(props: DismissInterviewsListArgs, mongoQuery: ClausesType) {
        const {page, pageSize, order} = props;
        const query = await this.getListQuery(props, mongoQuery);

        if (!query) {
            return {
                items: [],
                page: 0,
                pageSize: 10,
                total: 0,
            };
        }

        const [total, items] = await Promise.all([
            this.mysql.count(query),
            this.mysql.list(query, {
                pagination: {page, pageSize},
                ordering: {order, orderBy: props.orderBy},
            }),
        ]);

        const employees = await this.users.listByIds({
            searchIn: [
                ...items.map(dismissInterview => dismissInterview.employee || ''),
                ...items.map(dismissInterview => dismissInterview.manager || ''),
            ],
            account: this.account,
        });

        return {
            items: items.map(item => {
                const employee = employees.find(e => e.id === item.employee);

                return {
                    ...item,
                    rank: employee?.rank,
                    sector: employee?.sector,
                };
            }),
            page,
            pageSize,
            total,
        };
    }

    async generateAsyncReport(props: DismissInterviewsListArgs, mongoQuery: ClausesType) {
        const query = await this.getListQuery(props, mongoQuery);
        const data = {
            type: ExportReportsType.DISMISS_INTERVIEW,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async generateAsyncReportBody(query: Record<string, Record<string, unknown>>, account: Account) {
        const dismissInterviewsFromDB = query ? await this.mysql.list(query, {}) : [];
        if (!dismissInterviewsFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: [
                ...dismissInterviewsFromDB.map(dismissInterview => dismissInterview.employee || ''),
                ...dismissInterviewsFromDB.map(dismissInterview => dismissInterview.manager || ''),
            ],
            account: account.id,
        });

        const sectors = await this.orgChart.listByIds(employees.map(e => e.sector || ''));

        const ranks = await this.ranks.list();

        const dismissInterviews = dismissInterviewsFromDB.map(dismissInterview => {
            const employee = employees.find(e => dismissInterview.employee === e.id);

            return {
                'employee': employee?.name || '',
                'rank': ranks.find(r => r.id === employee?.rank)?.title || '',
                'sector': sectors.find(s => employee?.sector === s.id)?.name || '',
                'dismissed_at': getFormattedDateAndHour(dismissInterview.dismissed_at),
                'manager': employees.find(m => dismissInterview.manager === m.id)?.name || '',
            };
        });

        return mapper(account, ExportReportsType.DISMISS_INTERVIEW, dismissInterviews);
    }

    private async getListQuery(props: DismissInterviewsListArgs, mongoQuery?: ClausesType) {
        const clauses: ClausesType[] = [{'account': {'$eq': this.account}}];

        if (props.manager) {
            clauses.push({manager: {'$eq': props.manager}});
        }

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        if (props.employees?.length === 0) {
            return null;
        } else if (props.employees) {
            clauses.push({employee: {'$in': props.employees}});
        }

        clauses.push({dismissed_at: {'$gte': props.from}});
        clauses.push({dismissed_at: {'$lte': props.to}});

        return {'$and': clauses};
    }

    constructor(
        private employeesService: EmployeesService,
        private repository: DismissInterviewsRepository,
        private orgChart: OrgChartsService,
        private mysql: DismissInterviewsMysqlRepository,
        private tasks: AsyncTasksService,
        private users: UsersService,
        private ranks: RanksService,
        private account: string,
    ) {}
}
