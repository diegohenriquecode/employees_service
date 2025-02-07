import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {MongoQuery} from '@ucast/mongo';
import {DocumentClient} from 'aws-sdk/lib/dynamodb/document_client';
import {BarueriConfig} from 'config';
import moment from 'moment';
import buildFilterQuery from 'utils/convert-to-dynamo-expression';

import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {PendingAction, PendingActionsListArgs} from './schema';

export default class PendingActionsRepository {
    static config(cfg: BarueriConfig, user: string) {
        return new PendingActionsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.pendingActionsTable,
            cfg.pendingActionsByAccountAndDate,
            cfg.pendingActionsByAccountAndId,
            user,
        );
    }

    async list(account: string, employee: string, filter: MongoQuery, listProps: PendingActionsListArgs) {
        const Limit = listProps.pageSize;
        const params: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND #range between :from and :to',
            ExpressionAttributeNames: {'#account': 'account', '#range': RangeKey},
            ExpressionAttributeValues: {
                ':account': account,
                ':from': `${employee}#${listProps.from}`,
                ':to': `${employee}#${listProps.to}`,
            },
            ExclusiveStartKey: listProps.next && JSON.parse(listProps.next),
            Limit,
            ScanIndexForward: false,
        };

        if (Object.keys(filter).length > 0) {
            const filterQuery = buildFilterQuery(filter);
            params.FilterExpression = filterQuery.expression;
            params.ExpressionAttributeNames = {...params.ExpressionAttributeNames, ...filterQuery.names};
            params.ExpressionAttributeValues = {...params.ExpressionAttributeValues, ...filterQuery.values};
        }

        const items = [];

        do {
            const {Items, LastEvaluatedKey} = await this.documents.query(params);
            if (Items) {
                items.push(...Items);
            }
            params.ExclusiveStartKey = LastEvaluatedKey;
            params.Limit = Limit - items.length;
        } while (items.length < Limit && params.ExclusiveStartKey);

        return {
            items: items.map(DbMapper.from),
            next: JSON.stringify(params.ExclusiveStartKey),
        };
    }

    async listByEmployee(account: string, employee: string, includeDisabled = false) {
        const params = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#range, :range)',
            ExpressionAttributeNames: {'#account': 'account', '#range': RangeKey, '#done': 'done'},
            ExpressionAttributeValues: {':account': account, ':range': `${employee}#`, ':done': true},
            ScanIndexForward: false,
            FilterExpression: '#done <> :done',
        };

        if (!includeDisabled) {
            params.FilterExpression += ' AND #disabled <> :true';
            Object.assign(params.ExpressionAttributeNames, {'#disabled': 'disabled'});
            Object.assign(params.ExpressionAttributeValues, {':true': true});
        }

        const {Items} = await this.documents.queryAll(params);

        return Items
            .map(DbMapper.from);
    }

    async listRelatedToEmployee(account: string, employee: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            FilterExpression: '(#employee = :employee OR #data.#employee = :employee) AND #done <> :true AND #disabled <> :true',
            ExpressionAttributeNames: {'#account': 'account', '#employee': 'employee', '#data': 'data', '#disabled': 'disabled', '#done': 'done'},
            ExpressionAttributeValues: {':account': account, ':employee': employee, ':true': true},
        });
        return Items
            .map(DbMapper.from);
    }

    async create(Item = {}) {
        Item = {
            ...Item,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: DbMapper.to(Item),
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

    async patch(Item: PendingAction, field: string, value: unknown) {
        const {account, [RangeKey]: rash} = DbMapper.to(Item);
        await this.documents.update({
            TableName: this.table,
            Key: {account, [RangeKey]: rash},
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': field, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': value, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async delete(Item: PendingAction) {
        const {account, [RangeKey]: rash} = DbMapper.to(Item);
        await this.documents.delete({
            TableName: this.table,
            Key: {account, [RangeKey]: rash},
        });
    }

    async listBeforeAndAfter(account: string, startDate: string, endDate: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            IndexName: this.byAccountAndDateIndex,
            KeyConditionExpression: '#account = :account AND #created_at BETWEEN :minDate AND :maxDate',
            FilterExpression: '#disabled <> :true AND  #done <> :true',
            ExpressionAttributeNames: {'#account': 'account', '#created_at': 'created_at', '#disabled': 'disabled', '#done': 'done'},
            ExpressionAttributeValues: {':account': account, ':maxDate': endDate, ':true': true, ':minDate': startDate},
        });

        if (Items) {
            return Items
                .map(DbMapper.from);
        }

        return [];
    }

    async listByTypeAndId(account: string, type: string, id: string): Promise<PendingAction[]> {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            IndexName: this.byAccountAndId,
            KeyConditionExpression: '#account = :account AND #id = :id',
            FilterExpression: '#type = :type',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#id': 'id',
                '#type': 'type',
            },
            ExpressionAttributeValues: {
                ':account': account,
                ':id': id,
                ':type': type,
            },
        });
        return Items
            .map(DbMapper.from);
    }

    async listByAccountAndId(account: string, id: string): Promise<PendingAction[]> {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            IndexName: this.byAccountAndId,
            KeyConditionExpression: '#account = :account AND #id = :id',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#id': 'id',
            },
            ExpressionAttributeValues: {
                ':account': account,
                ':id': id,
            },
        });
        return Items
            .map(DbMapper.from);
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byAccountAndDateIndex: string,
        private byAccountAndId: string,
        private user: string,
    ) {}
}

class DbMapper {
    static to(Item) {
        if (!Item) {
            return Item;
        }

        return {
            ...Item,
            [RangeKey]: `${Item.employee}#${Item.date}#${Item.type}#${Item.id}`,
        };
    }

    static from(Item) {
        if (!Item) {
            return Item;
        }

        const {[RangeKey]: _, ...result} = Item;
        return result;
    }
}

const RangeKey = '_EmployeeDateTypeId';
