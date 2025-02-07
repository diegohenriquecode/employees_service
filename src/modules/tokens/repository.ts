import {BarueriConfig} from 'config';
import moment from 'moment';
import {v4 as uuid} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {Token, TokenProps} from './schema';

export default class TokensRepository {
    static config(cfg: BarueriConfig, user: string) {
        return new TokensRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.tokensTable,
            user,
        );
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {id},
        });
        return Item;
    }

    async create(props: TokenProps & {id?: string}) {
        const Item: Token = {
            id: uuid(),
            ...props,
            created_at: moment().toISOString(),
            created_by: this.userId,
            updated_at: moment().toISOString(),
            updated_by: this.userId,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
            ConditionExpression: 'attribute_not_exists(id)',
        });
        return Item;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private userId: string,
    ) { }
}
