import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {Template} from './schema';

export default class TemplatesRepository {
    static config(cfg: BarueriConfig, user: string) {
        return new TemplatesRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.templatesTable,
            cfg.templatesByAccountAndType,
            user,
        );
    }

    async list(account: string, type: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            IndexName: this.byAccountAndType,
            KeyConditionExpression: '#account = :account AND #type = :type',
            ProjectionExpression: 'id,#account,#type,created_at,created_by,updated_at,updated_by,properties.title,properties.#type',
            ExpressionAttributeNames: {'#account': 'account', '#type': 'type'},
            ExpressionAttributeValues: {':account': account, ':type': type},
        });

        return Items;
    }

    async create(Item = {}) {
        const now = moment().toISOString();
        Item = {
            ...Item,
            id: uuidV4(),
            created_at: now,
            created_by: this.user,
            updated_at: now,
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
                throw new ConflictError();
            }
            throw e;
        }

        return Item;
    }

    async retrieve(account: string, id: string) {

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {account, id},
        });

        return Item;
    }

    async update(current: Template, patch: Partial<Template>) {
        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: Item,
        });

        return Item;
    }

    async delete(item: Template) {
        await this.documents.delete({
            TableName: this.table,
            Key: {id: item.id, account: item.account},
        });
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byAccountAndType: string,
        private user: string,
    ) {}
}
