import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {Configuration} from './schema';

export default class ConfigurationRepository {
    static config(cfg: BarueriConfig, user: string, accountId: string) {
        return new ConfigurationRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.configurationTable,
            user,
            accountId,
        );
    }

    async retrieve() {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {
                account: this.accountId,
            },
        });

        return Item;
    }

    async create(Item: any = {}) {
        const now = moment().toISOString();
        Item = {
            ...Item,
            id: uuidV4(),
            created_by: this.user,
            created_at: now,
            updated_by: this.user,
            updated_at: now,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item,
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        const {account, usersCanEditAvatar, id} = Item;

        return {account, usersCanEditAvatar, id};
    }

    async update(current: Configuration, patch: Partial<Configuration>) {
        const Item = {
            ...current,
            ...patch,
            updated_by: this.user,
            updated_at: moment().toISOString(),
        };

        await this.documents.put({
            TableName: this.table,
            Item: Item,
        });

        return Item;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private accountId: string,
    ) {}
}
