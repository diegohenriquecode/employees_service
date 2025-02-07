import {BarueriConfig} from 'config';
import orderBy from 'lodash/orderBy';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {ExportReportsType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {getFormattedDate, getFormattedDateAndHour, mapper} from 'modules/async-tasks/utils';
import EmployeesService from 'modules/employees/service';
import {BadRequestError, ConflictError, ForbiddenError, NotFoundError} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import OrgSectorsService from 'modules/orgchart/service';
import UsersRepository from 'modules/users/repository.mysql';
import {AppUser, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import RolesService from '../roles/service';
import {MultidirectionalEvaluationByType} from './bases';
import EvaluationsRepository from './repository';
import EvaluationsMysqlRepository from './repository.mysql';
import {
    BatchUpdateEvaluationProps,
    CreateEvaluationProps,
    Evaluation,
    EvaluationDecisionMatrix,
    EvaluationProps,
    EvaluationStatus,
    EvaluationTagType,
    EvaluationType,
    EvaluationTypes,
    ListProps,
    MultidirectionalRegexp,
    out,
    ReportListProps,
    DecisionMatrixEvaluation,
    outMatrixReport,
    UpdateEvaluationProps,
    MultidirectionalTypes,
} from './schema';
import {ApesService} from './service-ape';
import {MatricesService} from './service-matrix';
import {MultidirectionalsService} from './service-multidirectional';
import {computedDaysLate, createTag} from './utils';

export default class EvaluationsService {

    static config(cfg: BarueriConfig, user: AppUser, account: Account): EvaluationsService {
        return new EvaluationsService(
            EvaluationsRepository.config(cfg, user.id, account.id),
            EvaluationsMysqlRepository.config(cfg),
            EmployeesService.config(cfg, user, account.id),
            UsersService.config(cfg, user, account.id),
            UsersRepository.config(cfg),
            OrgSectorsService.config(cfg, user, account.id),
            EventsTopicService.config(cfg),
            AccountsService.config(cfg, user.id),
            AsyncTasksService.config(cfg, user, account.id),
            account.id,
            user,
        );
    }

    async create(employee: string, props: Pick<CreateEvaluationProps, 'tag' | 'type' | 'deadline' | 'evaluators' | 'sector'>) {
        const employeeUser = await this.users.retrieve(employee);

        if (!props.tag) {
            props.tag = createTag(EvaluationTagType.single, employeeUser.id);
        }

        return this.for(props.type)
            .create(employeeUser as User, {
                ...props,
                deadline: props.deadline ?? null,
                employee: employeeUser.id,
                sector: props.sector || employeeUser.sector,
                rank: employeeUser.rank,
                account: this.account,
                status: EvaluationStatus.created,
            });
    }

    async batchCreateOnSector(sectorId: string, props: Pick<CreateEvaluationProps, 'tag' | 'type' | 'deadline' | 'evaluators'>) {
        if (!props.tag) {
            props.tag = createTag(EvaluationTagType.batch, sectorId);
        }

        const isMultidirectional = MultidirectionalRegexp.test(props.type);
        if (isMultidirectional) {
            return (this.for(props.type) as MultidirectionalsService)
                .batchCreateOnSector(sectorId, {
                    ...props,
                    deadline: props.deadline ?? null,
                });
        }

        return (this.for(EvaluationType.decision_matrix) as MatricesService)
            .batchCreateOnSector(sectorId, {
                ...props,
                deadline: props.deadline ?? null,
                account: this.account,
                status: EvaluationStatus.created,
            });
    }

    async batchCreateOnSectorDeep(sectorId: string, props: Pick<EvaluationProps, 'type' | 'deadline'>) {
        return (this.for(EvaluationType.decision_matrix) as MatricesService)
            .batchCreateOnSectorDeep(sectorId, {
                ...props,
                tag: createTag(EvaluationTagType.deep, sectorId),
                deadline: props.deadline ?? null,
                account: this.account,
                status: EvaluationStatus.created,
            });
    }

    async list(props: ListProps, mongoQuery: any) {
        const {page, pageSize, order, onlyLast} = props;

        const query = await this.getListQuery(props, mongoQuery);

        const listFunction = onlyLast ? this.mysql.listByLast : this.mysql.list;

        const {items, total} = await listFunction(query, {
            count: true,
            pagination: {page, pageSize},
            ordering: {order, orderBy: props.orderBy},
        });

        return {
            items: items.map(withDaysLate).map(out),
            page,
            pageSize,
            total,
        };
    }

    async decisionMatrixSummary(props: ReportListProps, mongoQuery: any) {

        const sectors = (await this.orgSectors.list(props.sector)).map(s => s.id);
        const query = this.listSummary(props, sectors, mongoQuery);

        const {items} = await this.mysql.listByLast(query, {
            count: false,
        });

        const evaluations = await this.repository.batchGet(items) as DecisionMatrixEvaluation[];

        const {items: allEmployees} = await this.users.list({
            account: this.account,
            sectors,
            includeSelf: false,
            includeDisabled: false,
        });

        const evaluationsSummary = evaluations
            .filter(evaluation => allEmployees.some(employee => employee.id === evaluation.employee))
            .map(evaluation => (
                {
                    ...evaluation,
                    grades: {
                        technical: evaluation.technical.avg,
                        emotional: evaluation.emotional.avg,
                    },
                }
            )).map(outMatrixReport);

        const evaluateds = evaluations.map(evaluation => evaluation.employee);
        const notEvaluateds = allEmployees.filter(employee => !evaluateds.includes(employee.id));

        const ret = {
            evaluations: evaluationsSummary,
            notEvaluateds: notEvaluateds.map(nt => nt.id),
        };

        return ret;
    }

    async APESummary(props: ListProps, mongoQuery: any) {
        const query = await this.getListQuery({...props, onlyCreated: true}, mongoQuery);

        const {items, total} = await this.mysql.list(query, {count: true});

        const uniqueEmployees: string[] = [];
        for (const ape of items) {
            if (!uniqueEmployees.includes(ape.employee)) {
                uniqueEmployees.push(ape.employee);
            }
        }

        return {
            created: total,
            uniqueEmployees,
        };
    }

    async summary(props: ListProps, mongoQuery: any) {
        const query = await this.getListQuery(props, mongoQuery);

        const result = await this.mysql
            .countByStatus(query);

        return {
            ...Object.fromEntries(Object.values(EvaluationStatus).map(s => [s, 0])),
            ...result,
        };
    }

    async listByEmployee(employeeId: string, type: EvaluationType, complete: boolean, from: Date, to: Date) {
        let list = await this.repository
            .listByEmployee(employeeId, type, complete ? [] : undefined);

        if (this.user.id === employeeId) {
            list = list.filter(evaluation => evaluation.status === EvaluationStatus.done);
        }

        if (from) {
            list = list.filter(evaluation => moment(evaluation.created_at).isSameOrAfter(moment(from)));
        }

        if (to) {
            list = list.filter(evaluation => moment(evaluation.created_at).isSameOrBefore(moment(to)));
        }

        const filteredList = [];
        for (const evaluation of list) {
            if (await this.user.ability.can('list', RolesService.object('Evaluation', evaluation))) {
                filteredList.push(evaluation);
            }
        }

        return orderBy(filteredList.map(withDaysLate), ['created_at'], ['desc']);
    }

    async countByAccount(accountId: string) {
        await this.accounts.retrieve(accountId);

        const evaluations = await this.repository.listByAccount(accountId);

        const ape = evaluations.filter(evaluation => evaluation.type === EvaluationType.ape);
        const decisionMatrix = evaluations.filter(evaluation => evaluation.type === EvaluationType.decision_matrix);
        const multidirectional = evaluations.filter(evaluation => MultidirectionalRegexp.test(evaluation.type));

        return {
            [EvaluationType.ape]: ape.length,
            [EvaluationType.decision_matrix]: decisionMatrix.length,
            multidirectional: multidirectional.length,
        };
    }

    private async _retrieve(employee: string, id: string) {
        const evaluation = await this.repository.retrieve(employee, id);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found');
        }

        return evaluation;
    }

    async retrieve(employee: string, id: string, toFill = false) {
        const evaluation = await this.repository.retrieve(employee, id);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found');
        }

        return this.for(evaluation.type)
            .retrieve(evaluation, toFill);
    }

    async retrieveEvaluations(employee: string, id: string) {
        const evaluation = await this.repository.retrieve(employee, id);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found');
        }

        return this.for(evaluation.type)
            .retrieveEvaluations(evaluation);
    }

    async remove(employee: string, id: string) {
        const evaluation = await this._retrieve(employee, id);

        if (this.user.id !== evaluation.created_by) {
            throw new ForbiddenError();
        }

        if (evaluation.type !== EvaluationType.decision_matrix && evaluation.status === EvaluationStatus.done) {
            throw new BadRequestError('Evaluation status is done');
        }

        if (!MultidirectionalRegexp.test(evaluation.type)) {
            return this.repository.remove(employee, id);
        }

        return this.for(evaluation.type)
            .remove(evaluation, employee);
    }

    async batchRemoveOnSector(sector: string, type?: EvaluationType) {
        return (this.for(EvaluationType.decision_matrix) as MatricesService)
            .batchRemoveOnSector(sector, type);
    }

    async batchRemoveOnSectorDeep(sectorId: string, type?: EvaluationType) {
        return (this.for(EvaluationType.decision_matrix) as MatricesService)
            .batchRemoveOnSectorDeep(sectorId, type);
    }

    async updateDeadline(employee: string, id: string, deadline: EvaluationProps['deadline']) {
        const evaluation = await this._retrieve(employee, id);

        if (this.user.id !== evaluation.created_by) {
            throw new ForbiddenError();
        }

        if (evaluation.status === EvaluationStatus.done) {
            throw new BadRequestError('Evaluation status is done');
        }

        await this.repository.update(evaluation, {deadline});
    }

    async disclosedToEmployee(employee: string, id: string, disclosed_to_employee: EvaluationProps['disclosed_to_employee']) {
        const evaluation = await this._retrieve(employee, id);

        if (evaluation.type !== EvaluationType.decision_matrix) {
            throw new BadRequestError('Evaluation must be decision matrix');
        }

        if (evaluation.status !== EvaluationStatus.done) {
            throw new BadRequestError('Evaluation status must be done');
        }

        if (evaluation.disclosed_to_employee) {
            throw new BadRequestError('Evaluation has already been sent to employee');
        }

        await this.repository.update(evaluation, {disclosed_to_employee});
    }

    async update(employee: string, id: string, patch: UpdateEvaluationProps) {
        const evaluation = await this._retrieve(employee, id);

        if (evaluation.type !== patch.type) {
            throw new BadRequestError('Can\'t change type');
        }

        if (evaluation.status === EvaluationStatus.done) {
            throw new BadRequestError('Evaluation status is done');
        }

        return this.for(evaluation.type)
            .update(evaluation, patch);
    }

    async batchUpdate(patches: BatchUpdateEvaluationProps<EvaluationTypes>) {
        return (this.for(EvaluationType.decision_matrix) as MatricesService)
            .batchUpdate(patches as BatchUpdateEvaluationProps<EvaluationDecisionMatrix>);
    }

    async batchFinish(patches: BatchUpdateEvaluationProps<EmptyObject>) {
        return (this.for(EvaluationType.decision_matrix) as MatricesService)
            .batchFinish(patches as BatchUpdateEvaluationProps<EmptyObject>);
    }

    async finish(employee: string, id: string) {
        const evaluation = await this._retrieve(employee, id);

        if (evaluation.status === EvaluationStatus.done) {
            throw new ConflictError('Evaluation status is done');
        }

        return this.for(evaluation.type)
            .finish(evaluation);
    }

    async setRead(employee: string, id: string) {
        if (this.user.id !== employee) {
            throw new ForbiddenError();
        }

        const evaluation = await this._retrieve(employee, id);

        if (evaluation.read) {
            throw new ConflictError('Already read');
        }

        await this.repository.update(evaluation, {
            read: true,
            read_at: moment().toISOString(),
        });
    }
    async apeGenerateAsyncReport(props: ListProps, mongoQuery: any) {
        const query = await this.getListQuery(props, mongoQuery);

        const data = {
            type: ExportReportsType.APE,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async apeGenerateAsyncReportBody(query: Record<string, unknown>, account: Account) {
        const {items: evaluationsFromDB} = await this.mysql.list(query);

        if (!evaluationsFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: [
                ...evaluationsFromDB.map(evaluation => evaluation.responsible || ''),
                ...evaluationsFromDB.map(evaluation => evaluation.employee || ''),
            ],
            account: account.id,
        });

        const sectors = await this
            .orgSectors.listByIds(evaluationsFromDB.map(evaluation => evaluation.sector || ''));

        const evaluations = evaluationsFromDB.map(evaluation => ({
            'responsible':
                employees.find(e => evaluation.responsible === e.id)?.name || '',
            'employee':
                employees.find(e => evaluation.employee === e.id)?.name || '',
            'created_at':
                getFormattedDateAndHour(evaluation.created_at),
            'updated_at':
                getFormattedDateAndHour(evaluation.updated_at),
            'sector':
                sectors.find(s => evaluation.sector === s.id)?.name || '',
            'status':
                this.getAPEStatusText(evaluation.status as EvaluationStatus),
        }));

        return mapper(account, ExportReportsType.APE, evaluations);
    }

    async decisionMatrixGenerateAsyncReport(props: ListProps, mongoQuery: any) {
        const query = await this.getListQuery(props, mongoQuery);

        const data = {
            type: ExportReportsType.DECISION_MATRIX,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async decisionMatrixGenerateAsyncReportBody(query: Record<string, unknown>, account: Account) {
        const {items: evaluationsFromDB} = await this.mysql.list(query);

        if (!evaluationsFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: [
                ...evaluationsFromDB.map(evaluation => evaluation.responsible || ''),
                ...evaluationsFromDB.map(evaluation => evaluation.employee || ''),
            ],
            account: account.id,
        });

        const sectors = await this
            .orgSectors.listByIds(evaluationsFromDB.map(evaluation => evaluation.sector || ''));

        const evaluations = evaluationsFromDB.map(evaluation => ({
            'responsible':
                employees.find(e => evaluation.responsible === e.id)?.name || '',
            'employee':
                employees.find(e => evaluation.employee === e.id)?.name || '',
            'created_at':
                getFormattedDateAndHour(evaluation.created_at),
            'deadline':
                this.getDecisionMatrixDeadLineDate(evaluation.deadline),
            'daysLate':
                withDaysLate(evaluation).daysLate || 0,
            'sector':
                sectors.find(s => evaluation.sector === s.id)?.name || '',
            'status':
                this.getDecisionMatrixStatusText(evaluation.status as EvaluationStatus),
            'result': evaluation.result ? `report.decision-matrix.result.${evaluation.result}` : '',
        }));

        return mapper(account, ExportReportsType.DECISION_MATRIX, evaluations);
    }

    async multidirectionalGenerateAsyncReport(props: ListProps, mongoQuery: any) {
        const query = await this.getListQuery(props, mongoQuery);

        const data = {
            type: ExportReportsType.MULTIDIRECTIONAL,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async multidirectionalGenerateAsyncReportBody(query: Record<string, unknown>, account: Account) {
        const {items: evaluationsFromDB} = await this.mysql.list(query);

        if (!evaluationsFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: [
                ...evaluationsFromDB.map(evaluation => evaluation.responsible || ''),
                ...evaluationsFromDB.map(evaluation => evaluation.employee || ''),
            ],
            account: account.id,
        });

        const sectors = await this
            .orgSectors.listByIds(evaluationsFromDB.map(evaluation => evaluation.sector || ''));

        const evaluations = evaluationsFromDB.map(evaluation => ({
            'employee':
                employees.find(e => evaluation.employee === e.id)?.name || '',
            'responsible':
                employees.find(e => evaluation.responsible === e.id)?.name || '',
            'sector':
                sectors.find(s => evaluation.sector === s.id)?.name || '',
            'type':
                this.getMultidirectionalTypeText(evaluation),
            'status':
                this.getDecisionMatrixStatusText(evaluation.status as EvaluationStatus),
            'created_at':
                getFormattedDateAndHour(evaluation.created_at),
            'answered_at':
                this.getEvaluationAnsweredAt(evaluation),
        }));

        return mapper(account, ExportReportsType.MULTIDIRECTIONAL, evaluations);
    }

    private async getListQuery(props: ListProps, mongoQuery: any) {
        const {daysLate, employee, responsible, from, sector, deep = false, status, to, type, onlyCreated} = props;

        const clauses: any[] = [
            {account: {'$eq': this.account}},
            {
                '$or': [
                    {removed: {'$eq': false}},
                    {removed: {'$eq': null}},
                ],
            },
        ];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        if (daysLate) {
            const date = moment.utc()
                .subtract(daysLate, 'days')
                .toISOString();
            clauses.push({
                '$or': [
                    {'$and': [{status: {'$eq': EvaluationStatus.done}}, {daysLate: {'$gte': daysLate}}]},
                    {'$and': [{status: {'$ne': EvaluationStatus.done}}, {deadline: {'$lte': date}}]},
                ],
            });
        }

        if (employee) {
            clauses.push({employee: {'$eq': employee}});
        }

        if (responsible) {
            clauses.push({responsible: {'$eq': responsible}});
        }

        if (sector) {
            if (deep) {
                const descendants = await this.orgSectors.list(sector);
                clauses.push({'sector': {'$in': descendants.map(d => d.id)}});
            } else {
                clauses.push({sector: {'$eq': sector}});
            }
        }

        if (status) {
            clauses.push({status: {'$eq': status}});
        }

        if (type === EvaluationType.multidirectional) {
            clauses.push({type: {'$in': MultidirectionalTypes}});
        } else if (type) {
            clauses.push({type: {'$eq': type}});
        }

        if (onlyCreated) {
            clauses.push({created_at: {'$gte': from}});
            clauses.push({created_at: {'$lte': to}});
        } else if (props.from && props.to) {
            clauses.push({
                $or: [
                    {$and: [{created_at: {'$gte': from.toISOString()}}, {created_at: {'$lte': to.toISOString()}}]},
                    {$and: [{finished_at: {'$gte': from.toISOString()}}, {finished_at: {'$lte': to.toISOString()}}]},
                ],
            });
        }

        return {'$and': clauses};
    }

    private listSummary(props: ReportListProps, sectors: string[], mongoQuery: any) {
        const {from, to, type} = props;

        const clauses: any[] = [
            {account: {'$eq': this.account}},
            {
                '$or': [
                    {removed: {'$eq': false}},
                    {removed: {'$eq': null}},
                ],
            },
        ];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        if (sectors) {
            clauses.push({sector: {'$in': sectors}});
        }

        if (type) {
            clauses.push({type: {'$eq': type}});
        }

        clauses.push({finished_at: {'$gte': from}});
        clauses.push({finished_at: {'$lte': to}});

        return {'$and': clauses};
    }

    private for(type: EvaluationType) {
        if (type === EvaluationType.decision_matrix) {
            return new MatricesService(this.repository, this.mysql, this.users, this.orgSectors, this.events, this.account, this.user);
        } else if (type === EvaluationType.ape) {
            return new ApesService(this.repository, this.users, this.user);
        } else if (MultidirectionalRegexp.test(type)) {
            return new MultidirectionalsService(this.repository, this.users, this.account, this.user, this.orgSectors, this.employeesService);
        } else {
            throw new BadRequestError(`Unknown type: ${type}`);
        }
    }

    private getDecisionMatrixStatusText(evaluationStatus: EvaluationStatus) {
        if (evaluationStatus !== EvaluationStatus.done) {
            return 'report.decision-matrix.status.not-done';
        }
        return `report.decision-matrix.status.${evaluationStatus}`;
    }

    private getDecisionMatrixDeadLineDate(deadline: string | null | undefined) {
        if (deadline) {
            return getFormattedDate(deadline);
        } else {
            return 'report.decision-matrix.no-deadline';
        }
    }

    private getAPEStatusText(evaluationStatus: EvaluationStatus) {
        return `report.ape.status.${evaluationStatus}`;
    }

    private getMultidirectionalTypeText(evaluation: Evaluation) {
        const template = MultidirectionalEvaluationByType[evaluation.type];
        return template.title;
    }

    private getEvaluationAnsweredAt(evaluation: Partial<Evaluation>) {
        if (evaluation.status === EvaluationStatus.done) {
            return getFormattedDateAndHour(evaluation.updated_at);
        }

        return '';
    }

    constructor(
        private repository: EvaluationsRepository,
        private mysql: EvaluationsMysqlRepository,
        private employeesService: EmployeesService,
        private users: UsersService,
        private usersRepository: UsersRepository,
        private orgSectors: OrgSectorsService,
        private events: EventsTopicService,
        private accounts: AccountsService,
        private tasks: AsyncTasksService,
        private account: string,
        private user: AppUser,
    ) { }
}

function withDaysLate(evaluation: Evaluation) {
    if (evaluation.deadline && evaluation.status !== EvaluationStatus.done) {
        evaluation.daysLate = computedDaysLate(evaluation.deadline);
    }
    return evaluation;
}
