import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BatchGetCommandInput} from '@aws-sdk/lib-dynamodb';
import {BarueriConfig} from 'config';
import chunk from 'lodash/chunk';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {Training, TrainingProps} from './schema';

export default class TrainingsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new TrainingsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.trainingsTable,
            user,
            account,
        );
    }

    async create(props: Omit<TrainingProps, 'account'>) {
        const Item: Training = {
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
                Item,
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError('Key already exists');
            }
            throw e;
        }

        return mapper.from(Item);
    }

    async update(current: Training, patch: Partial<TrainingProps>) {
        const Item: Training = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return mapper.from(Item);
    }

    async patch(id: string, fieldName: keyof TrainingProps, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(id),
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async retrieve(id: string, accountId?: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(id, accountId),
        });

        return mapper.from(Item as Training);
    }

    async listByIds(ids: string[], accountId?: string): Promise<Training[]> {
        const Items: Training[] = [];

        if (!ids || ids.length === 0) {
            return [];
        }

        const groups = chunk(ids, 25);

        for (const group of groups) {
            const keys = group.map((id: string) => this.getKey(id, accountId));

            const params: BatchGetCommandInput = {
                RequestItems: {
                    [this.table]: {
                        Keys: keys,
                    },
                },
            };

            const response = await this.documents.batchGet(params);
            if (response.Responses && response.Responses[this.table]) {
                Items.push(...response.Responses[this.table] as Training[]);
            }
        }

        return (Items as Training[]).map(mapper.from);
    }

    async listByAccount(accountId: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            ExpressionAttributeNames: {'#account': 'account'},
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeValues: {
                ':account': accountId,
            },
        });

        return (Items as Training[]).map(mapper.from);
    }

    async listForAccount(accountId: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            ExpressionAttributeNames: {'#account': 'account', '#allowedAccounts': 'allowedAccounts'},
            KeyConditionExpression: '#account = :account',
            FilterExpression: 'contains(#allowedAccounts, :forAccount)',
            ExpressionAttributeValues: {
                ':account': 'backoffice',
                ':forAccount': accountId,
            },
        });

        return (Items as Training[]).map(mapper.from);
    }

    async countByAccount(accountId: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            ExpressionAttributeNames: {'#account': 'account'},
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeValues: {
                ':account': accountId,
            },
        });

        return Items.length;
    }

    private getKey(id: string, accountId?: string) {
        return {account: accountId || this.account, id};
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    from: (training: Training): Training => {
        if (!training) {
            return training;
        }
        return {
            ...training,
            allowedAccounts: training.allowedAccounts || [],
        };
    },
};
