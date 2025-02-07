import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import DynamoClient from 'utils/dynamo-client';
import {v4 as uuidV4} from 'uuid';

import {BarueriConfig} from '../../config';
import {Role} from './schema';

export default class RolesRepository {
    static config(cfg: BarueriConfig, user: string, account: string): RolesRepository {
        return new RolesRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.rolesTable,
            user,
            account,
        );
    }

    private omit(Item: Partial<Role>) {
        if (!Item) {
            return Item;
        }
        const enabled = Item?.enabled ?? true;
        return {...Item, enabled} as Role;
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {id, account: this.account},
        });

        return this.omit(Item as Role);
    }

    async list(includePrivate = false, onlyEnabled = false) {
        const filterConditions: string[] = [];
        const expressionAttributeNames: { [key: string]: string } = {'#account': 'account'};
        const expressionAttributeValues: { [key: string]: any } = {':account': this.account};

        if (!includePrivate) {
            filterConditions.push('#private = :false');
            expressionAttributeNames['#private'] = 'private';
            expressionAttributeValues[':false'] = false;
        }

        if (onlyEnabled) {
            filterConditions.push('#enabled = :true');
            expressionAttributeNames['#enabled'] = 'enabled';
            expressionAttributeValues[':true'] = true;
        }

        const params: any = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        };

        if (filterConditions.length > 0) {
            params.FilterExpression = filterConditions.join(' AND ');
        }

        const {Items} = await this.documents.queryAll(params);
        const mappedItems = Items.map((item) => (this.omit(item)));

        return mappedItems;
    }

    async create(Item = {}) {
        const now = moment().toISOString();
        Item = {
            id: uuidV4(),
            ...Item,
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

        return Item as Role;
    }

    async update(current: Role, patch: Partial<Role>) {
        const Item = {
            ...current,
            ...patch,
            enabled: patch.enabled ?? true,
            updated_by: this.user,
            updated_at: moment().toISOString(),
        };

        await this.documents.put({
            TableName: this.table,
            Item: Item,
        });

        return Item as Role;
    }

    async delete(item: Role) {
        await this.documents.delete({
            TableName: this.table,
            Key: {id: item.id},
        });
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}
