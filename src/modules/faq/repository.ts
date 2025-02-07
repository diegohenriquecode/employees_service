import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {Faq} from './schema';

export default class FaqRepository {
    static config(cfg: BarueriConfig, user: string) {
        return new FaqRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.faqTable,
            user,
        );
    }

    async list() {
        const {Items} = await this.documents.scanAll({
            TableName: this.table,
        });

        return Items;
    }

    async create(Item = {}) {
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

        return Item;
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {id},
        });

        return Item;
    }

    async update(current: Faq, patch: Partial<Faq>) {
        const onlyUnique = (value: string, index: number, array: typeof current.tags) => {
            return array.indexOf(value) === index;
        };

        const tags = patch?.tags ? patch.tags.filter(onlyUnique) : current.tags;

        const Item = {
            ...current,
            ...patch,
            tags,
            updated_by: this.user,
            updated_at: moment().toISOString(),
        };

        await this.documents.put({
            TableName: this.table,
            Item: Item,
        });

        return Item;
    }

    async delete(item: Faq) {
        await this.documents.delete({
            TableName: this.table,
            Key: {id: item.id},
        });
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
    ) {}
}
