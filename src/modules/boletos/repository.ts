import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import moment from 'moment/moment';

import {BarueriConfig} from '../../config';
import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {Boleto, BoletoProps} from './schema';

export default class BoletosRepository {
    static config(cfg: BarueriConfig, userId: string) {
        return new BoletosRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.boletosTable,
            cfg.boletosById,
            cfg.boletosByStatus,
            userId,
        );
    }

    async create(Item: BoletoProps) {
        const newItem = {
            ...Item,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: newItem,
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError('Key already exists');
            }
            throw e;
        }

        return Item as Boleto;
    }

    async list(account: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#hash = :hash',
            ExpressionAttributeNames: {'#hash': 'account'},
            ExpressionAttributeValues: {':hash': account},
        });

        return Items as Boleto[];
    }

    async listByStatus(status: Boleto['status']) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            IndexName: this.byStatusIndex,
            KeyConditionExpression: '#hash = :hash',
            ExpressionAttributeNames: {'#hash': 'status'},
            ExpressionAttributeValues: {':hash': status},
        });

        return Items as Boleto[];
    }

    async retrieve(id: string) {
        const {Items: [Item] = []} = await this.documents.query({
            TableName: this.table,
            IndexName: this.byIdIndex,
            KeyConditionExpression: '#hash = :hash',
            ExpressionAttributeNames: {'#hash': 'id'},
            ExpressionAttributeValues: {':hash': id},
        });

        return Item as Boleto | undefined;
    }

    async update(current: Boleto, update: Partial<BoletoProps>) {
        const Item = {
            ...current,
            ...update,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
            ConditionExpression: 'attribute_exists(id)',
        });

        return Item;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byIdIndex: string,
        private byStatusIndex: string,
        private user: string,
    ) {}
}
