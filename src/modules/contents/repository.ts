import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import {updateExpression} from '../../utils/convert-to-dynamo-expression';
import DynamoClient from '../../utils/dynamo-client';
import {Content, ContentProps} from './schema';

export default class ContentsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new ContentsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.contentsTable,
            user,
            account,
        );
    }

    async create(props: Omit<ContentProps, 'account'>) {
        const Item = {
            id: uuidV4(),
            ...props,
            account: this.account,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        } as Content;

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

        return Item;
    }

    async update(current: Content, patch: Partial<Omit<ContentProps, 'account'>>) {
        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        } as Content;

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return Item;
    }

    async patch(id: string, fieldName: keyof ContentProps, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(id),
            ...updateExpression({
                set: {
                    [fieldName]: fieldValue,
                    updated_at: moment().toISOString(),
                    updated_by: this.user,
                },
            }),
        });
    }

    async retrieve(id: string, accountId?: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(id, accountId),
        });

        return Item as Content;
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
