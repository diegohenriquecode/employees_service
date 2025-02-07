import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';

import DynamoClient from '../../utils/dynamo-client';
import {TrainingProgress, TrainingProgressProps} from './schema';

export default class TrainingProgressesRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new TrainingProgressesRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.trainingProgressesTable,
            user,
            account,
        );
    }

    async create(training: string, props: Omit<TrainingProgressProps, 'account'>) {
        const Item: TrainingProgress = {
            ...props,
            training,
            account: this.account,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: mapper.toRepo(Item),
                ConditionExpression: 'attribute_not_exists(#range)',
                ExpressionAttributeNames: {'#range': '_employee_training'},
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError('Key already exists');
            }
            throw e;
        }

        return Item;
    }

    async update(current: TrainingProgress, patch: Partial<TrainingProgressProps>) {
        const Item: TrainingProgress = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: mapper.toRepo(Item),
        });

        return Item;
    }

    async patch(employee: string, training: string, fieldName: keyof TrainingProgressProps, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(employee, training),
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async retrieve(employee: string, training: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(employee, training),
        });

        return mapper.fromRepo(Item as InRepoTrainingProgress);
    }

    async listByEmployee(employee: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_employee_training, :employee)',
            ExpressionAttributeNames: {'#account': 'account', '#_employee_training': '_employee_training'},
            ExpressionAttributeValues: {':account': this.account, ':employee': employee},
        });

        return (Items as InRepoTrainingProgress[]).map(mapper.fromRepo);
    }

    private getKey(employee: string, training: string) {
        return {
            account: this.account,
            _employee_training: formatRangeKey(employee, training),
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

const formatRangeKey = (employee: string, training: string) => `${employee}:${training}`;

const mapper = {
    toRepo: (progress: TrainingProgress): InRepoTrainingProgress => {
        if (!progress) {
            return progress;
        }
        return {
            ...progress,
            _employee_training: formatRangeKey(progress.employee, progress.training),
        };
    },
    fromRepo: (progress: InRepoTrainingProgress): TrainingProgress => {
        if (!progress) {
            return progress;
        }

        const {_employee_training, ...result} = progress;
        return {...result, progress: result.progress ?? computeProgress(result.topics)};
    },
};

type InRepoTrainingProgress = TrainingProgress & {
    _employee_training: string
};

function computeProgress(topics: TrainingProgress['topics']) {
    const topicsArray = Object.values(topics);
    const sum = topicsArray.reduce((total, curr) => total += curr.progress, 0);
    return (topicsArray.length > 0) ? Math.floor(sum / topicsArray.length) : 0;
}
