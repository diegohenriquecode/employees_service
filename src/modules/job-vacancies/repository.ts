import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import DynamoClient from 'utils/dynamo-client';
import {v4 as uuidV4} from 'uuid';

import {JobVacancy, JobVacancyProps, VacancyStatus} from './schema';

export default class JobVacanciesRepository {
    static config(cfg: BarueriConfig, user: string, accountId: string) {
        return new JobVacanciesRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.jobVacanciesTable,
            user,
            accountId,
        );
    }

    async create(Item: any = {}) {
        const now = moment().toISOString();
        Item = {
            ...Item,
            account: this.accountId,
            id: uuidV4(),
            created_by: this.user,
            created_at: now,
            updated_by: this.user,
            updated_at: now,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item,
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        return mapper.fromRepo(Item as JobVacancy);
    }

    async update(current: JobVacancyProps, patch: Partial<JobVacancyProps>) {
        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: Item,
        });

        return mapper.fromRepo(Item as JobVacancy);
    }

    async retrieve(id: string) {
        const Key = this.getKey(id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        return mapper.fromRepo(Item as JobVacancy);
    }

    async delete(id: string) {
        const Key = this.getKey(id);

        await this.documents.delete({
            TableName: this.table,
            Key,
        });
    }

    private getKey(id: string) {
        return {
            account: this.accountId,
            id,
        };
    }

    async listByAccount() {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {'#account': 'account'},
            ExpressionAttributeValues: {':account': this.accountId},
        });

        return Items.map(Item => mapper.fromRepo(Item as JobVacancy));
    }

    constructor(
    private documents: DynamoClient,
    private table: string,
    private user: string,
    private accountId: string,
    ) {}
}

const mapper = {
    fromRepo: (jobVacancy: JobVacancy): JobVacancy => {
        if (!jobVacancy) {
            return jobVacancy;
        }

        return {
            ...jobVacancy,
            status: jobVacancy.status ?? VacancyStatus.OPEN,
        };
    },
};
