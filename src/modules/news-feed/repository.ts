import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {DocumentClient} from 'aws-sdk/lib/dynamodb/document_client';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {NewsFeed, NewsFeedProps, NewsFeedStatus} from './schema';

export default class NewsFeedRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new NewsFeedRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.newsFeedTable,
            user,
            account,
        );
    }

    async create(props: Pick<NewsFeedProps, 'text' | 'account' | 'video_type' | 'video_uploaded_id' | 'video_url'>) {
        const Item: NewsFeed = {
            id: uuidV4(),
            ...props,
            comments: 0,
            status: NewsFeedStatus.active,
            image_key: null,
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
                throw new ConflictError();
            }
            throw e;
        }

        return Item;
    }

    async update(current: NewsFeed, patch: Partial<NewsFeed>) {
        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return Item;
    }

    async patch(id: string, fieldName: string, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(id),
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {
                '#field': fieldName,
                '#updated': 'updated_at',
                '#user': 'updated_by',
            },
            ExpressionAttributeValues: {
                ':value': fieldValue,
                ':updated': new Date().toISOString(),
                ':user': this.user,
            },
        });
    }

    async retrieve(id: string) {
        const Key = this.getKey(id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });
        return Item;
    }

    async delete(current: NewsFeed) {
        const Item = {
            ...current,
            status: NewsFeedStatus.inactive,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });
    }

    async listByAccount() {
        const params: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {'#account': 'account', '#status': 'status'},
            ExpressionAttributeValues: {':account': this.account, ':status': NewsFeedStatus.active},
            FilterExpression: '#status = :status',
        };

        const {Items} = await this.documents.queryAll(params);

        return Items as NewsFeed[];
    }

    private getKey(id: string) {
        return {
            account: this.account,
            id,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}
