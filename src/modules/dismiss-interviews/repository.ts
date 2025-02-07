import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuid} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {CreateDismissInterviewProps, DismissInterview} from './schema';

export default class DismissInterviewsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new DismissInterviewsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.dismissInterviewsTable,
            account,
            user,
        );
    }

    async create(employeeId: string, props: CreateDismissInterviewProps) {
        const Item: DismissInterview = {
            ...props,
            id: uuid(),
            account: this.account,
            employee: employeeId,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                ConditionExpression: 'attribute_not_exists(id)',
                Item: mapper.toRepo(Item),
            });

        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        return Item;
    }

    async retrieve(id: string, employeeId: string) {
        const Key = this.getKey(id, employeeId);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        return Item;
    }

    async listByEmployee(employee: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_employee_id, :employee)',
            ProjectionExpression: 'id,employee,created_at,created_by,updated_at,updated_by',
            ExpressionAttributeNames: {'#account': 'account', '#_employee_id': '_employee_id'},
            ExpressionAttributeValues: {':account': this.account, ':employee': employee},
        });

        return Items.map(Item => mapper.fromRepo(Item as InRepositoryDismissInterview));
    }

    async listByDateRange(from: string, to: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            FilterExpression: '#dismissed_at BETWEEN :from AND :to',
            ExpressionAttributeNames: {'#account': 'account', '#dismissed_at': 'dismissed_at'},
            ExpressionAttributeValues: {
                ':account': this.account,
                ':from': from,
                ':to': to,
            },
        });

        return Items.map(Item => mapper.fromRepo(Item as InRepositoryDismissInterview));
    }

    private getKey(id: string, employeeId: string) {
        return {
            account: this.account,
            _employee_id: `${employeeId}:${id}`,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private account: string,
        private user: string,
    ) {}
}

const mapper = {
    toRepo: (dismissInterview: DismissInterview): InRepositoryDismissInterview => {
        if (!dismissInterview) {
            return dismissInterview;
        }

        return {
            ...dismissInterview,
            _employee_id: `${dismissInterview.employee}:${dismissInterview.id}`,
        };
    },
    fromRepo: (dismissInterview: InRepositoryDismissInterview): DismissInterview => {
        if (!dismissInterview) {
            return dismissInterview;
        }

        const {_employee_id, ...result} = dismissInterview;

        return result;
    },
};

type InRepositoryDismissInterview = DismissInterview & {
    _employee_id: string
};
