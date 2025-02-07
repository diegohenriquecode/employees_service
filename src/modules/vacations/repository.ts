import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {AbsenceType, Vacation, VacationProps} from './schema';

export default class VacationsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new VacationsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.vacationsTable,
            user,
            account,
        );
    }

    async create(props: Omit<VacationProps, 'account'>) {
        const Item: Vacation = {
            id: uuidV4(),
            ...props,
            account: this.account,
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
                throw new ConflictError('Key already exists');
            }
            throw e;
        }

        return Item;
    }

    async update(current: Vacation, patch: Partial<VacationProps>) {
        const Item: Vacation = {
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

    async patch(employee: string, id: string, fieldName: keyof VacationProps, fieldValue: any) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(employee, id),
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async listByAccount() {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {'#account': 'account'},
            ExpressionAttributeValues: {':account': this.account},
        });

        const repoVacations = Items as InRepoVacation[];
        return repoVacations.map(repoVacation => mapper.fromRepo(repoVacation));
    }

    async listByEmployee(employee: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_EmployeeId, :employee)',
            ExpressionAttributeNames: {'#account': 'account', '#_EmployeeId': '_EmployeeId'},
            ExpressionAttributeValues: {':account': this.account, ':employee': employee},
        });

        const repoVacations = Items as InRepoVacation[];
        return repoVacations.map(repoVacation => mapper.fromRepo(repoVacation));
    }

    async retrieve(employee: string, id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(employee, id),
        });

        const repoVacation = Item as InRepoVacation;
        return mapper.fromRepo(repoVacation);
    }

    async delete(employee: string, id: string) {
        await this.documents.delete({
            TableName: this.table,
            Key: this.getKey(employee, id),
        });
    }

    private getKey(employee: string, id: string) {
        return {
            account: this.account,
            _EmployeeId: `${employee}#${id}`,
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
    toRepo: (vacation: Vacation): InRepoVacation => {
        if (!vacation) {
            return vacation;
        }

        return {
            ...vacation,
            _EmployeeId: `${vacation.employee}#${vacation.id}`,
        };
    },
    fromRepo: (vacation: InRepoVacation): Vacation => {
        if (!vacation) {
            return vacation;
        }

        const {_EmployeeId, type = AbsenceType.VACATION, ...result} = vacation;

        return {...result, type};
    },
};

type InRepoVacation = Vacation & {
    _EmployeeId: string
};
