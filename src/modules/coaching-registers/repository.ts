import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {CoachingRegister, CoachingRegisterProps, CoachingRegisterTodo} from './schema';

export default class CoachingRegistersRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new CoachingRegistersRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.coachingRegistersTable,
            user,
            account,
        );
    }

    async create(props: CoachingRegisterProps) {
        const Item: CoachingRegister = {
            id: uuidV4(),
            ...props,
            todos: props.todos.map(todo => ({...todo, id: uuidV4(), completed: false, completed_at: null})),
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: mapper.toRepo(Item),
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        return Item;
    }

    async update(current: CoachingRegister, patch: Partial<CoachingRegister>) {
        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: mapper.toRepo(Item),
        });

        return Item;
    }

    async retrieve(employee: string, id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(employee, id),
        });

        const repoCoachingRegister = Item as InRepositoryCoachingRegister;
        return mapper.fromRepo(repoCoachingRegister);
    }

    async listByEmployee(employee: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_employee_id, :employee)',
            ProjectionExpression: 'id,employee,#read,sector,#type,created_at,created_by,updated_at,updated_by',
            ExpressionAttributeNames: {'#account': 'account', '#_employee_id': '_employee_id', '#type': 'type', '#read': 'read'},
            ExpressionAttributeValues: {':account': this.account, ':employee': employee},
        });

        const repoCoachingRegisters = Items as InRepositoryCoachingRegister[];
        return repoCoachingRegisters.map(repoCoachingRegister => mapper.fromRepo(repoCoachingRegister));
    }

    async countByAccount(accountId: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {'#account': 'account'},
            ExpressionAttributeValues: {':account': accountId},
        });

        const repoCoachingRegisters = Items as InRepositoryCoachingRegister[];
        return repoCoachingRegisters.length;
    }

    async patch(employee: string, id: string, fieldName: string, fieldValue: any) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(employee, id),
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async createToDo(current: CoachingRegister, todo: Omit<CoachingRegisterTodo, 'id' | 'completed' | 'completed_at'>) {
        const {employee, id, todos} = current;

        todos.push({...todo, id: uuidV4(), completed: false, completed_at: null});

        await this.patch(employee, id, 'todos', todos);
    }

    async retrieveToDo(current: CoachingRegister, todoId: string) {
        const {todos} = current;

        const todoIdx = todos.findIndex(todo => todo.id === todoId);
        if (todoIdx < 0) {
            return null;
        }

        return todos[todoIdx];
    }

    async updateToDo(current: CoachingRegister, todoId: string, update: CoachingRegisterTodo) {
        const {employee, id, todos} = current;

        const todoIdx = todos.findIndex(todo => todo.id === todoId);
        todos[todoIdx] = update;

        await this.patch(employee, id, 'todos', todos);
    }

    async deleteToDo(current: CoachingRegister, todoId: string) {
        const {employee, id, todos} = current;

        const todoIdx = todos.findIndex(todo => todo.id === todoId);
        todos.splice(todoIdx, 1);

        await this.patch(employee, id, 'todos', todos);
    }

    async listBeforeDate(to: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            FilterExpression: '#created_at <= :to',
            ExpressionAttributeNames: {'#account': 'account', '#created_at': 'created_at'},
            ExpressionAttributeValues: {
                ':account': this.account,
                ':to': to,
            },
        });
        const inRepoCoaching = Items as InRepositoryCoachingRegister[];
        return inRepoCoaching.map(inRepo => mapper.fromRepo(inRepo));
    }

    private getKey(employee: string, id: string) {
        return {
            account: this.account,
            _employee_id: `${employee}:${id}`,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    toRepo: (coachingRegister: CoachingRegister): InRepositoryCoachingRegister => {
        if (!coachingRegister) {
            return coachingRegister;
        }
        return {
            ...coachingRegister,
            _employee_id: `${coachingRegister.employee}:${coachingRegister.id}`,
        };
    },
    fromRepo: (coachingRegister: InRepositoryCoachingRegister) => {
        if (!coachingRegister) {
            return coachingRegister;
        }
        const {_employee_id, todos, ...result} = coachingRegister;
        return {
            ...result,
            todos: todos
                ? todos.map(currentToDoFormat)
                : undefined,
        };
    },
};

type InRepositoryCoachingRegister = CoachingRegister & {
    _employee_id: string
};

function currentToDoFormat(oldTodo: CoachingRegisterTodo & {title?: string, deadline?: string}): CoachingRegisterTodo {
    if (!oldTodo) {
        return oldTodo;
    }

    const {title: what, deadline: when, ...result} = oldTodo;

    return {
        what,
        when,
        ...result,
    };
}
