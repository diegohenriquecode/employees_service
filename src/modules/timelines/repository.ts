import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {MongoQuery} from '@ucast/mongo';
import {DocumentClient} from 'aws-sdk/lib/dynamodb/document_client';
import {BarueriConfig} from 'config';
import moment from 'moment';
import buildFilterQuery from 'utils/convert-to-dynamo-expression';

import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {ListTimelineProps, Timeline, TimelineProps} from './schema';

export default class TimelinesRepository {

    static config(cfg: BarueriConfig, user: string) {
        return new TimelinesRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.timelinesTable,
            cfg.timelinesByAccountAndId,
            user,
        );
    }

    async list(account: string, employee: string, listProps: ListTimelineProps, filter: MongoQuery) {
        const Limit = listProps.pageSize ?? 10;
        const params: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND #range between :from and :to',
            ExclusiveStartKey: listProps.next && JSON.parse(listProps.next),
            ExpressionAttributeNames: {'#account': 'account', '#range': RangeKey},
            ExpressionAttributeValues: {
                ':account': account,
                ':from': `${employee}#${listProps.from.toISOString()}`,
                ':to': `${employee}#${listProps.to.toISOString()}`,
            },
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
            items: (items as InRepositoryTimeline[]).map(DbMapper.from),
            next: JSON.stringify(params.ExclusiveStartKey),
        };
    }

    async create(props: TimelineProps) {
        const Item: Timeline = {
            ...props,
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

    async listByAccountAndId(account: string, id: string) {
        const {Items: items} = await this.documents.queryAll({
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

        return items as InRepositoryTimeline[];
    }

    async remove(item: InRepositoryTimeline) {
        await this.documents.delete({
            TableName: this.table,
            Key: {account: item.account, _EmployeeDateTypeId: item._EmployeeDateTypeId},
        });
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byAccountAndId: string,
        private user: string,
    ) {}
}

const RangeKey = '_EmployeeDateTypeId';

class DbMapper {
    static to(Item: Timeline): InRepositoryTimeline {
        if (!Item) {
            return Item;
        }
        return {
            ...Item,
            [RangeKey]: `${Item.employee}#${Item.date}#${Item.type}#${Item.id}`,
        };
    }
    static from(Item: InRepositoryTimeline): Timeline {
        if (!Item) {
            return Item;
        }
        const {[RangeKey]: _, ...result} = Item;
        return result;
    }
}

type InRepositoryTimeline = Timeline & {
  [RangeKey]: string
};
