import {BarueriConfig} from 'config';
import orderBy from 'lodash/orderBy';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {ExportReportsType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {getFormattedDateAndHour, mapper} from 'modules/async-tasks/utils';
import {BadRequestError, ConflictError, NotFoundError} from 'modules/errors/errors';
import OrgSectorsService from 'modules/orgchart/service';
import RolesService from 'modules/roles/service';
import UsersRepository from 'modules/users/repository';
import {AppUser, RelationSector} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import FeedbacksRepository from './repository';
import FeedbacksMysqlRepository from './repository.mysql';
import {ClausesType, Feedback, FeedbackProps, FeedbackStatus, FeedbackType, validateFeedbackStatusOnCreateParams} from './schema';

export default class FeedbacksService {

    static config(cfg: BarueriConfig, user: AppUser, account: string): FeedbacksService {
        return new FeedbacksService(
            FeedbacksRepository.config(cfg, user.id, account),
            FeedbacksMysqlRepository.config(cfg),
            UsersService.config(cfg, user, account),
            UsersRepository.config(cfg, user.id, account),
            OrgSectorsService.config(cfg, user, account),
            AccountsService.config(cfg, user.id),
            AsyncTasksService.config(cfg, user, account),
            account,
            user,
        );
    }

    static validateFeedbackStatusOnCreate({
        userIsManagerAbove,
        employeeIsManagerAbove,
        userIsSubordinateBelow,
        userSectorIsDiferentOfEmployeeUserSector,
    }: validateFeedbackStatusOnCreateParams): FeedbackStatus {
        if (
            !userIsManagerAbove
            && !employeeIsManagerAbove
            && !userIsSubordinateBelow
            && userSectorIsDiferentOfEmployeeUserSector
        ) {
            return FeedbackStatus.pending_approval;
        }

        return FeedbackStatus.approved;
    }

    async create(employee: string, props: Pick<FeedbackProps, 'type' | 'text' | 'sector'>) {
        const employeeUser = await this.getEmployee(employee);

        if (!Object.keys(employeeUser.sectors).includes(props.sector)) {
            throw new BadRequestError('Employee doesn\'t belongs to sector');
        }

        let status = FeedbackStatus.approved;

        const userIsManagerAbove = await this.isManagerAbove(props.sector, this.user.sectors);
        const employeeIsManagerAbove = await this.isManagerAbove(props.sector, employeeUser.sectors);
        const userIsSubordinateBelow = await this.isSubordinateBelow(this.user.sectors, employeeUser.sectors, props.sector);
        const userSectorIsDiferentOfEmployeeUserSector = this.user.sector !== employeeUser.sector;

        if (this.user) {
            status = FeedbacksService.validateFeedbackStatusOnCreate({
                userIsManagerAbove,
                employeeIsManagerAbove,
                userIsSubordinateBelow,
                userSectorIsDiferentOfEmployeeUserSector,
            });
        }

        return await this.repository.create({
            ...props,
            read: false,
            read_at: null,
            employee,
            sector: props.sector || employeeUser.sector,
            rank: employeeUser.rank,
            account: this.account,
            status,
        });
    }

    async list(props: ListProps, mongoQuery: ClausesType) {
        const {page, pageSize, order} = props;

        const query = await this.getListQuery(props, mongoQuery);

        const [total, items] = await Promise.all([
            this.mysql.count(query),
            this.mysql.list(query, {
                pagination: {page, pageSize},
                ordering: {order, orderBy: props.orderBy},
            }),
        ]);

        return {
            items,
            page,
            pageSize,
            total,
        };
    }

    async retrieve(feedbackId: string, mongoQuery: ClausesType) {
        const query = await this.getRetrieveByIdQuery(feedbackId, mongoQuery);

        const item = await this.mysql.retrieve(query);

        if (!item) {
            throw new NotFoundError('Feedback not found');
        }

        return item;
    }

    async summary(props: ListProps, mongoQuery: ClausesType) {
        const sectors = (await this.orgSectors.list(props.sector)).map(s => s.id);

        const query = await this.getListQuery({...props, type: undefined}, mongoQuery);
        const items = await this.mysql.list(query);

        const complimentItems = items.filter(item => item.type === FeedbackType.compliment);
        const guidanceItems = items.filter(item => item.type === FeedbackType.guidance);

        const {items: subUsers} = await this.users.list({account: this.account, sectors});
        const createdByQuery = this.getAuthorsQuery(props.from, props.to, subUsers.map(su => su.id), mongoQuery);
        const sent = await this.mysql.list(createdByQuery);

        const complimentSent = sent.filter(s => s.type === FeedbackType.compliment);
        const guidanceSent = sent.filter(s => s.type === FeedbackType.guidance);

        const complimentReceived = complimentItems.filter(feedback => feedback.status !== FeedbackStatus.pending_approval && feedback.status !== FeedbackStatus.denied);
        const complimentPending = complimentItems.filter(feedback => feedback.status === FeedbackStatus.pending_approval);

        const guidanceReceived = guidanceItems.filter(feedback => feedback.status !== FeedbackStatus.pending_approval && feedback.status !== FeedbackStatus.denied);
        const guidancePending = guidanceItems.filter(feedback => feedback.status === FeedbackStatus.pending_approval);

        return {
            compliment: this.calcSummary(complimentReceived, complimentPending, complimentSent),
            guidance: this.calcSummary(guidanceReceived, guidancePending, guidanceSent),
        };

    }

    private calcSummary(received: Feedback[], pending: Feedback[], sent: Feedback[]) {
        const receivedEmployees: string[] = [];
        for (const feedback of received) {
            if (!receivedEmployees.includes(feedback.employee)) {
                receivedEmployees.push(feedback.employee);
            }
        }

        const pendingEmployees: string[] = [];
        for (const feedback of pending) {
            if (!pendingEmployees.includes(feedback.employee)) {
                pendingEmployees.push(feedback.employee);
            }
        }

        const sentEmployees: string[] = [];
        for (const feedback of sent) {
            if (!sentEmployees.includes(feedback.created_by)) {
                sentEmployees.push(feedback.created_by);
            }
        }

        return {
            received: {
                count: received.length,
                uniqueEmployees: receivedEmployees,
            },
            pending: {
                count: pending.length,
                uniqueEmployees: pendingEmployees,
            },
            sent: {
                count: sent.length,
                uniqueEmployees: sentEmployees,
            },
        };
    }

    async generateAsyncReport(props: ListProps, mongoQuery: ClausesType) {
        const query = await this.getListQuery(props, mongoQuery);
        const data = {
            type: ExportReportsType.FEEDBACK,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async generateAsyncReportBody(query: Record<string, unknown>, account: Account) {
        const feedbacksFromDB = await this.mysql.list(query);
        if (!feedbacksFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: [
                ...feedbacksFromDB.map(feedback => feedback.created_by),
                ...feedbacksFromDB.map(feedback => feedback.employee),
            ],
            account: account.id,
        });

        const sectors = await this.orgSectors
            .listByIds(feedbacksFromDB.map(feedback => feedback.sector || ''));

        const feedbacks = feedbacksFromDB.map(feedback => ({
            'created_by': employees.find(e => feedback.created_by === e.id)?.name,
            'employee': employees.find(e => feedback.employee === e.id)?.name || '',
            'type': this.getFeedbackTypeText(feedback),
            'sector': sectors.find(s => feedback.sector === s.id)?.name || '',
            'created_at': getFormattedDateAndHour(feedback.created_at),
            'status': this.getFeedbackStatusText(feedback),
        }));

        return mapper(account, ExportReportsType.FEEDBACK, feedbacks);
    }

    async countByAccount(accountId: string) {
        await this.accounts.retrieve(accountId);

        const total = await this.mysql.count({
            $and: [{account: {$eq: accountId}}],
        });

        return total;
    }

    async listByEmployee(employee: string) {

        let list = await this.repository.listByEmployee(employee);

        const filteredList = [];
        for (const feedback of list) {
            if (await this.user.ability.can('list', RolesService.object('Feedback', feedback))) {
                filteredList.push(feedback);
            }
        }

        list = filteredList;

        return orderBy(list, ['created_at'], ['desc']);
    }

    private async isManagerAbove(targetSector: string, sectors: RelationSector) {
        const tSector = await this.orgSectors.retrieve(targetSector);
        const managerOf = Object.keys(sectors).filter(s => sectors[s].is_manager);

        return managerOf.some(mo => tSector.path.includes(mo));
    }

    private async isSubordinateBelow(sourceSectors: RelationSector, TargetSectors: RelationSector, targetSector: string) {
        if (!TargetSectors[targetSector].is_manager) {
            return false;
        }

        for (const relation of Object.keys(sourceSectors)) {
            const relationDetails = await this.orgSectors.retrieve(relation);

            if (relationDetails.path.includes(targetSector)) {
                return true;
            }
        }

        return false;
    }

    async findById(employee: string, id: string) {
        const feedback = await this.repository.retrieve(employee, id);

        if (!feedback) {
            throw new NotFoundError('Feedback not found');
        }

        return feedback;
    }

    async update(employee: string, id: string, props: Pick<FeedbackProps, 'type' | 'text'>) {
        await this.getEmployee(employee);

        const currentFeedback = await this.findById(employee, id);

        return await this.repository.update(currentFeedback, props);
    }

    async setRead(employee: string, id: string) {
        await this.getEmployee(employee);

        const currentFeedback = await this.findById(employee, id);

        if (currentFeedback.read) {
            throw new ConflictError('Already read');
        }

        await this.repository.update(currentFeedback, {
            read: true,
            read_at: moment().toISOString(),
        });
    }

    async allow(employee: string, id: string, status: FeedbackStatus) {
        await this.getEmployee(employee);

        const currentFeedback = await this.findById(employee, id);

        if (currentFeedback.status !== FeedbackStatus.pending_approval) {
            throw new ConflictError('Already evaluated');
        }

        return await this.repository.update(currentFeedback, {status});
    }

    async delete(employee: string, id: string) {
        await this.getEmployee(employee);
        await this.findById(employee, id);

        await this.repository.delete(employee, id);
    }

    private async getRetrieveByIdQuery(feedbackId: string, mongoQuery: ClausesType) {
        const clauses: ClausesType[] = [{account: {'$eq': this.account}}];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        clauses.push({id: {'$eq': feedbackId}});

        return {'$and': clauses};
    }

    private async getListQuery(props: ListProps, mongoQuery: ClausesType) {
        const {created_by, employee, sector, type, from, to, deep} = props;
        const clauses: ClausesType[] = [{account: {'$eq': this.account}}];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        if (created_by) {
            clauses.push({created_by: {'$eq': created_by}});
        }

        if (employee) {
            clauses.push({employee: {'$eq': employee}});
        }

        if (sector) {
            if (deep) {
                const descendants = await this.orgSectors.list(sector);
                clauses.push({'sector': {'$in': descendants.map(d => d.id)}});
            } else {
                clauses.push({sector: {'$eq': sector}});
            }
        }

        if (type) {
            clauses.push({type: {'$eq': type}});
        }

        clauses.push({created_at: {'$gte': from.toISOString()}});
        clauses.push({created_at: {'$lte': to.toISOString()}});

        return {'$and': clauses};
    }

    private getAuthorsQuery(from: Date, to: Date, authors: string[], mongoQuery: ClausesType) {
        const clauses: ClausesType[] = [{account: {'$eq': this.account}}];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        clauses.push({created_by: {'$in': authors}});

        clauses.push({created_at: {'$gte': from.toISOString()}});
        clauses.push({created_at: {'$lte': to.toISOString()}});

        return {'$and': clauses};
    }

    private async getEmployee(employee: string) {
        const employeeUser = await this.usersRepository.retrieve(employee);
        if (!employeeUser) {
            throw new NotFoundError('Employee not found');
        }
        return employeeUser;
    }

    private getFeedbackStatusText(feedback: Partial<Feedback>) {
        if (feedback.status && feedback.status !== FeedbackStatus.approved) {
            return `report.feedback.status.${feedback.status}`;
        } else {
            return feedback.read ? 'report.feedback.read' : 'report.feedback.unread';
        }
    }

    private getFeedbackTypeText(feedback: Partial<Feedback>) {
        return `report.feedback.type.${feedback.type}`;
    }

    constructor(
        private repository: FeedbacksRepository,
        private mysql: FeedbacksMysqlRepository,
        private users: UsersService,
        private usersRepository: UsersRepository,
        private orgSectors: OrgSectorsService,
        private accounts: AccountsService,
        private tasks: AsyncTasksService,
        private account: string,
        private user: AppUser,
    ) { }
}

type ListProps = {
    page: number
    pageSize: number

    created_by?: string
    from: Date
    employee?: string
    sector?: string
    deep: boolean
    to: Date
    type?: string
    format: 'summary' | 'json' | 'xlsx'
    order: 'ASC' | 'DESC'
    orderBy: string
};
