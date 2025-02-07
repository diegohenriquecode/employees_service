import moment from 'moment';

import {BarueriConfig} from '../../config';
import DynamoClient from '../../utils/dynamo-client';
import {ClimateCheckAssiduity, ClimateCheckAssiduityProps} from './schema';

export default class ClimateCheckAssiduityRepository {
    static config(cfg: BarueriConfig, account: string): ClimateCheckAssiduityRepository {
        return new ClimateCheckAssiduityRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.climateCheckAssiduityTable,
            account,
        );
    }

    async create(props: ClimateCheckAssiduityProps) {
        const Item: ClimateCheckAssiduity = {
            ...props,
            account: this.account,
            created_at: moment().toISOString(),
        };

        await this.documents.put({
            TableName: this.table,
            Item: mapper.toRepo(Item),
        });

        return Item;
    }

    async list(sector: string, from: string, to: string) {
        const {Items = []} = await this.documents.query({
            TableName: this.table,
            KeyConditionExpression: '#account = :account and #range between :from and :to',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#range': '_SectorDate',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':from': `${sector}:${from}`,
                ':to': `${sector}:${to}`,
            },
        });

        return (Items as InRepoClimateCheckAssiduity[]).map(mapper.fromRepo);
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private account: string,
    ) {}
}

const mapper = {
    toRepo: (assiduity: ClimateCheckAssiduity): InRepoClimateCheckAssiduity => {
        if (!assiduity) {
            return assiduity;
        }

        return {
            ...assiduity,
            _SectorDate: `${assiduity.sector}:${assiduity.date}`,
        };
    },
    fromRepo: (assiduity: InRepoClimateCheckAssiduity): ClimateCheckAssiduity => {
        if (!assiduity) {
            return assiduity;
        }
        const {_SectorDate, ...result} = assiduity;
        return result;
    },
};

type InRepoClimateCheckAssiduity = ClimateCheckAssiduity & {
  _SectorDate: string
};
