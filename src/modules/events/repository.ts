import {BarueriConfig} from 'config';

import DynamoClient from '../../utils/dynamo-client';

export default class EventsRepository {
    static config(cfg: BarueriConfig) {
        return new EventsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.eventsTable,
        );
    }

    async create(Item: Record<string, any>) {
        await this.documents.put({
            TableName: this.table,
            Item,
        });
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
    ) { }
}
