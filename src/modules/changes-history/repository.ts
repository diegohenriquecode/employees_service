import {DocumentClient} from 'aws-sdk/lib/dynamodb/document_client';
import {BarueriConfig} from 'config';
import fastjsonpatch from 'fast-json-patch';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {ChangesHistory, ChangesHistoryProps, ListProps} from './schema';

export default class ChangesHistoryRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new ChangesHistoryRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.changesHistoryTable,
            cfg.changesHistoryByAccountAndDate,
            user,
            account,
        );
    }

    async list(props: ListProps) {
        const params: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            IndexName: this.byDateIndex,
            KeyConditionExpression: '#account = :account AND #date BETWEEN :from AND :to',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#date': 'change_date',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':from': props.from.toISOString(),
                ':to': props.to.toISOString(),
            },
        };

        let FilterExpression = '';

        if (props.entity) {
            FilterExpression += '#entity = :entity';
            Object.assign(params.ExpressionAttributeNames, {'#entity': 'entity'});
            Object.assign(params.ExpressionAttributeValues, {':entity': props.entity});
        }

        if (props.entity_id) {
            FilterExpression += FilterExpression ? ' AND ' : '';
            FilterExpression += '#entity_id = :entity_id';
            Object.assign(params.ExpressionAttributeNames, {'#entity_id': 'entity_id'});
            Object.assign(params.ExpressionAttributeValues, {':entity_id': props.entity_id});
        }

        if (FilterExpression) {
            params.FilterExpression = FilterExpression;
        }

        const {Items} = await this.documents.queryAll(params);
        return Items?.map((item) => DbMapper.from(item as InRepositoryChangesHistory));
    }

    async create(props: Omit<ChangesHistoryProps, 'id' | 'diffData'>, id?: string) {
        const Item: Omit<ChangesHistory, 'diffData'> = {
            ...props,
            id: id || uuidV4(),
            created_at: moment().toISOString(),
            created_by: 'change-history',
        };

        await this.documents.put({
            TableName: this.table,
            Item: DbMapper.to(Item),
            ConditionExpression: 'attribute_not_exists(id)',
        });

        return Item;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byDateIndex: string,
        private user: string,
        private account: string,
    ) { }
}

const RangeKey = '_EntityEntityIDDate';

class DbMapper {
    static to(Item: Omit<ChangesHistory, 'diffData'>): InRepositoryChangesHistory {
        if (!Item) {
            return Item;
        }

        const diffData = fastjsonpatch.compare(Item.oldData || {}, Item.newData || {});

        return {
            ...Item,
            diffData,
            [RangeKey]: `${Item.entity}#${Item.entity_id}#${Item.change_date}`,
        };
    }
    static from(Item: InRepositoryChangesHistory): ChangesHistory {
        if (!Item) {
            return Item;
        }
        const {[RangeKey]: _, ...result} = Item;
        return result;
    }
}

type InRepositoryChangesHistory = ChangesHistory & {
    [RangeKey]: string
};
