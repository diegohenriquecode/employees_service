import {CoachingRegistersListArgs} from 'api/app/coaching-registers/schema';
import {BarueriConfig} from 'config';
import {sortBy, uniq} from 'lodash';
import orderBy from 'lodash/orderBy';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {ExportReportsType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {getFormattedDateAndHour, mapper} from 'modules/async-tasks/utils';
import {BadRequestError, ConflictError, ForbiddenError, NotFoundError} from 'modules/errors/errors';
import {ClausesType} from 'modules/feedbacks/schema';
import OrgChartsService from 'modules/orgchart/service';
import UsersRepository from 'modules/users/repository';
import {AppUser} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import CoachingRegistersRepository from './repository';
import CoachingRegistersMysqlRepository from './repository.mysql';
import {CoachingRegisterProps, CoachingRegisterTodo, coachingRegisterStatus} from './schema';

export default class CoachingRegistersService {

    static config(cfg: BarueriConfig, user: AppUser, account: string): CoachingRegistersService {
        return new CoachingRegistersService(
            CoachingRegistersRepository.config(cfg, user.id, account),
            UsersRepository.config(cfg, user.id, account),
            UsersService.config(cfg, user, account),
            AccountsService.config(cfg, user.id),
            OrgChartsService.config(cfg, user, account),
            CoachingRegistersMysqlRepository.config(cfg),
            AsyncTasksService.config(cfg, user, account),
            user,
            account,
        );
    }

    async create(employee: string, props: Pick<CoachingRegisterProps, 'current_state' | 'intended_state' | 'todos' | 'sector'>) {
        const {sector, sectors, rank} = await this.getEmployee(employee);

        if (!Object.keys(sectors).includes(props.sector)) {
            throw new BadRequestError('Employee doesn\'t belongs to sector');
        }

        const currentSector = props.sector || sector;
        const manager = await this.usersService.getManager({id: employee, sector: currentSector}) as string;

        return await this.repository.create({
            ...props,
            read: false,
            read_at: null,
            employee,
            sector: currentSector,
            manager,
            rank,
            account: this.account,
        });
    }

    async listByEmployee(employee: string) {
        await this.getEmployee(employee);

        const list = await this.repository.listByEmployee(employee);

        return orderBy(list, ['created_at'], ['desc']);
    }

    async findById(employee: string, id: string) {
        const coaching = await this.repository.retrieve(employee, id);

        if (!coaching) {
            throw new NotFoundError('CoachingRegister not found');
        }

        return coaching;
    }

    async countByAccount(accountId: string) {
        await this.accounts.retrieve(accountId);

        const total = await this.repository.countByAccount(accountId);

        return total;
    }

    async update(employee: string, id: string, props: Pick<CoachingRegisterProps, 'current_state' | 'intended_state' | 'todos'>) {
        await this.getEmployee(employee);

        const currentCoaching = await this.findById(employee, id);

        return await this.repository.update(currentCoaching, props);
    }

    async setRead(employee: string, id: string) {
        if (this.user.id !== employee) {
            throw new ForbiddenError();
        }

        const currentCoaching = await this.findById(employee, id);

        if (currentCoaching.read) {
            throw new ConflictError('Already read');
        }

        await this.repository.update(currentCoaching, {
            read: true,
            read_at: moment().toISOString(),
        });
    }

    async addTodo(employee: string, id: string, data: Omit<CoachingRegisterTodo, 'id' | 'completed' | 'completed_at'>) {
        const currentCoaching = await this.findById(employee, id);

        await this.repository.createToDo(currentCoaching, data);
    }

    async updateTodo(employee: string, id: string, todoId: string, {how, how_much, what, when, where, who, why}: Omit<CoachingRegisterTodo, 'id' | 'completed' | 'completed_at'>) {
        const currentCoaching = await this.findById(employee, id);

        const todo = await this.repository.retrieveToDo(currentCoaching, todoId);
        if (!todo) {
            throw new NotFoundError('Todo not found');
        }

        await this.repository.updateToDo(currentCoaching, todoId, {
            ...todo,
            how: how ?? todo.how,
            how_much: how_much ?? todo.how_much,
            what: what ?? todo.what,
            when: when ?? todo.when,
            where: where ?? todo.where,
            who: who ?? todo.who,
            why: why ?? todo.why,
        });
    }

    async deleteTodo(employee: string, id: string, todoId: string) {
        const currentCoaching = await this.findById(employee, id);

        const todo = await this.repository.retrieveToDo(currentCoaching, todoId);
        if (!todo) {
            throw new NotFoundError('Todo not found');
        }

        await this.repository.deleteToDo(currentCoaching, todoId);
    }

    async completeTodo(employee: string, id: string, todoId: string, completed_at: Date) {
        const currentCoaching = await this.findById(employee, id);

        const todo = await this.repository.retrieveToDo(currentCoaching, todoId);
        if (!todo) {
            throw new NotFoundError('Todo not found');
        }
        if (todo.completed) {
            throw new ConflictError('Todo already completed');
        }

        await this.repository.updateToDo(currentCoaching, todoId, {
            ...todo,
            completed: true,
            completed_at: completed_at.toISOString(),
        });
    }

    async report(sector: string, from: string, to: string) {
        const subSectors = (await this.orgChartService.list(sector)).map(s => s.id);
        const coachingRegisters = await this.repository.listBeforeDate(to);
        const subCoachingRegisters = coachingRegisters.filter(cr => subSectors.includes(cr.sector));

        const completed = subCoachingRegisters.filter(cr => cr.todos?.every(todo => todo.completed))
            .filter(cr => cr.updated_at >= from);

        const inProgress = subCoachingRegisters.filter(cr => cr.todos?.some(todo => !todo.completed));

        let allFromPeriod = coachingRegisters.filter(cr => cr.created_at >= from)
            .filter(cr => subSectors.includes(cr.sector));

        allFromPeriod = [...inProgress, ...allFromPeriod, ...completed];
        allFromPeriod = sortBy(allFromPeriod, ['created_at'], ['desc']);
        allFromPeriod = uniq(allFromPeriod);

        return {
            completed: completed.length,
            inProgress: inProgress.length,
            allFromPeriod: allFromPeriod.map(register => ({
                ...register,
                status: register.todos?.some(todo => !todo.completed) ? coachingRegisterStatus.inProgress : coachingRegisterStatus.completed,
            })),
        };

    }

    async list(props: CoachingRegistersListArgs, mongoQuery: ClausesType) {
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

    async generateAsyncReport(props: CoachingRegistersListArgs, mongoQuery: ClausesType) {
        const query = await this.getListQuery(props, mongoQuery);
        const data = {
            type: ExportReportsType.COACHING_REGISTER,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async generateAsyncReportBody(query: Record<string, unknown>, account: Account) {
        const coachingRegistersFromDB = await this.mysql.list(query);
        if (!coachingRegistersFromDB.length) {
            return [];
        }

        const employees = await this.usersService.listByIds({
            searchIn: [
                ...coachingRegistersFromDB.map(coachingRegister => coachingRegister.employee),
                ...coachingRegistersFromDB.map(coachingRegister => coachingRegister.manager || coachingRegister.employee),
            ],
            account: account.id,
        });

        const sectors = await this.orgChartService
            .listByIds(coachingRegistersFromDB.map(coachingRegister => coachingRegister.sector || ''));

        const coachingRegisters = coachingRegistersFromDB.map(coachingRegister => ({
            'employee': employees.find(e => coachingRegister.employee === e.id)?.name || '',
            'manager': employees.find(e => coachingRegister.manager === e.id)?.name || '',
            'sector': sectors.find(s => coachingRegister.sector === s.id)?.name || '',
            'status': coachingRegister.read ? 'report.coaching-register.read' : 'report.coaching-register.unread',
            'created_at': getFormattedDateAndHour(coachingRegister.created_at),
            'in_progress': coachingRegister.in_progress_todos,
            'completed': coachingRegister.completed_todos,
        }));

        return mapper(account, ExportReportsType.COACHING_REGISTER, coachingRegisters);
    }

    private async getListQuery(props: CoachingRegistersListArgs, mongoQuery: ClausesType) {
        const {employee, manager, sector, deep} = props;
        const clauses: ClausesType[] = [{account: {'$eq': this.account}}];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        if (manager) {
            clauses.push({manager: {'$eq': manager}});
        }

        if (employee) {
            clauses.push({employee: {'$eq': employee}});
        }

        if (sector) {
            if (deep) {
                const descendants = await this.orgChartService.list(sector);
                clauses.push({'sector': {'$in': descendants.map(d => d.id)}});
            } else {
                clauses.push({sector: {'$eq': sector}});
            }
        }

        clauses.push({created_at: {'$gte': props.from}});
        clauses.push({created_at: {'$lte': props.to}});

        return {'$and': clauses};
    }

    private async getEmployee(employee: string) {
        const employeeUser = await this.users.retrieve(employee);
        if (!employeeUser) {
            throw new NotFoundError('Employee not found');
        }
        return employeeUser;
    }

    constructor(
        private repository: CoachingRegistersRepository,
        private users: UsersRepository,
        private usersService: UsersService,
        private accounts: AccountsService,
        private orgChartService: OrgChartsService,
        private mysql: CoachingRegistersMysqlRepository,
        private tasks: AsyncTasksService,
        private user: AppUser,
        private account: string,
    ) {}
}
