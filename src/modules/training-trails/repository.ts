import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import isArray from 'lodash/isArray';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {TrainingTrail, TrainingTrailProps} from './schema';

export default class TrainingTrailsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new TrainingTrailsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.trainingTrailsTable,
            user,
            account,
        );
    }

    async create(props: Omit<TrainingTrailProps, 'account'>) {
        const Item: TrainingTrail = {
            ...props,
            id: uuidV4(),
            account: this.account,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item,
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError('Key already exists');
            }
            throw e;
        }

        return Item;
    }

    async update(current: TrainingTrail, patch: Partial<TrainingTrailProps>) {
        const Item: TrainingTrail = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return Item;
    }

    async patch(id: string, fieldName: keyof TrainingTrailProps, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(id),
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(id),
        });

        return mapper.fromRepo(Item as TrainingTrail);
    }

    async listByAccount() {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            ExpressionAttributeNames: {'#account': 'account'},
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeValues: {
                ':account': this.account,
            },
        });

        return (Items as TrainingTrail[]).map(mapper.fromRepo);
    }

    private getKey(id: string) {
        return {account: this.account, id};
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    fromRepo: (trainingTrail: TrainingTrail): TrainingTrail => {
        if (!trainingTrail || !trainingTrail.employee) {
            return trainingTrail;
        }

        return {
            ...trainingTrail,
            employee: isArray(trainingTrail.employee) ? trainingTrail.employee : [trainingTrail.employee],
        };
    },
};
