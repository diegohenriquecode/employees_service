import {BarueriConfig} from 'config';
import random from 'generate-password';
import moment from 'moment';

import DynamoClient from '../../utils/dynamo-client';
import {Session, SessionProps} from './schema';

export default class SessionsRepository {
    static config(cfg: BarueriConfig, userId: string) {
        return new SessionsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.sessionsTable,
            userId,
        );
    }

    async create(props: SessionProps) {
        const Item: Session = {
            ...props,
            id: random.generate({length: 64, numbers: true, lowercase: true}),
            created_at: moment().toISOString(),
            created_by: this.userId,
            updated_at: null,
            updated_by: null,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
            ConditionExpression: 'attribute_not_exists(id)',
        });

        return Item;
    }

    async patch(id: string, fieldName: string, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: {id},
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.userId},
        });
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {id},
        });
        return Item as Session;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private userId: string,
    ) { }
}
