import {ClimateCheckNumbers} from 'modules/climate-checks/schema';
import moment from 'moment';

import {BarueriConfig} from '../../config';
import DynamoClient from '../../utils/dynamo-client';
import {ClimateCheckHistoryItem, ClimateCheckHistoryItemType, InternalClimateCheckHistoryItem} from './schema';

export default class ClimateCheckHistoryRepository {
    static config(cfg: BarueriConfig, account: string): ClimateCheckHistoryRepository {
        return new ClimateCheckHistoryRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.climateCheckHistoryTable,
            account,
        );
    }

    async create(sector: string, type: ClimateCheckHistoryItemType, date: string, numbers: ClimateCheckNumbers): Promise<ClimateCheckHistoryItem> {
        const Item: InternalClimateCheckHistoryItem = {
            ...numbers,
            _SectorTypeDate: `${sector}:${type}:${date}`,
            account: this.account,
            created_at: moment().toISOString(),
            date,
            sector,
            type,
        };
        await this.documents.put({
            TableName: this.table,
            Item,
        });
        return fromDb(Item);
    }

    async list(sector: string, type: ClimateCheckHistoryItemType, from: string, to: string) {
        const {Items = []} = await this.documents.query({
            TableName: this.table,
            KeyConditionExpression: '#account = :account and #range between :from and :to',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#range': '_SectorTypeDate',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':from': `${sector}:${type}:${from}`,
                ':to': `${sector}:${type}:${to}`,
            },
        });

        return (Items as InternalClimateCheckHistoryItem[]).map(fromDb);
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private account: string,
    ) {}
}

function fromDb({_SectorTypeDate, ...Item}: InternalClimateCheckHistoryItem): ClimateCheckHistoryItem {
    return Item;
}
