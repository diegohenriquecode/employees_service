import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {EvaluationsScheduler, EvaluationsSchedulerProps, UpdateEvaluationsSchedulerProps} from './schema';

export default class EvaluationsSchedulerRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new EvaluationsSchedulerRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.evaluationsSchedulerTable,
            cfg.evaluationsSchedulersByStatus,
            user,
            account,
        );
    }

    async create(props: EvaluationsSchedulerProps) {
        const Item: EvaluationsScheduler = {
            id: uuidV4(),
            ...props,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: mapper.toRepo(Item),
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        return Item;
    }

    async retrieve(sector: string, id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(sector, id),
        });

        return mapper.fromRepo(Item as InRepositoryEvaluationsScheduler);
    }

    async listByStatus(status: string) {
        const {Items} = await this.documents.query({
            TableName: this.table,
            IndexName: this.byStatusIndex,
            KeyConditionExpression: '#account = :account AND #status = :status',
            ExpressionAttributeNames: {'#account': 'account', '#status': 'status'},
            ExpressionAttributeValues: {':account': this.account, ':status': status},
        });
        const inRepoItems = Items as InRepositoryEvaluationsScheduler[];
        return inRepoItems.map(inRepo => mapper.fromRepo(inRepo));
    }

    async listBySector(sector: string, type: EvaluationsSchedulerProps['type']) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_sector_id, :sector)',
            ExpressionAttributeNames: {'#account': 'account', '#_sector_id': '_sector_id', '#type': 'type'},
            ExpressionAttributeValues: {':account': this.account, ':sector': sector, ':type': type},
            FilterExpression: '#type = :type',
        });

        const inRepoItems = Items as InRepositoryEvaluationsScheduler[];
        return inRepoItems.map(inRepo => mapper.fromRepo(inRepo));
    }

    async update(current: EvaluationsScheduler, update: Partial<UpdateEvaluationsSchedulerProps>) {
        const Item: InRepositoryEvaluationsScheduler = {
            ...current,
            ...update,
            _sector_id: this.getKey(current.sector, current.id)._sector_id,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: mapper.toRepo(Item),
        });

        return Item;
    }

    async delete(sector: string, id: string) {
        await this.documents.delete({
            TableName: this.table,
            Key: this.getKey(sector, id),
        });
    }

    private getKey(sector: string, id: string) {
        return {
            account: this.account,
            _sector_id: `${sector}:${id}`,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byStatusIndex: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    toRepo: (scheduler: EvaluationsScheduler): InRepositoryEvaluationsScheduler => {
        if (!scheduler) {
            return scheduler;
        }
        return {
            ...scheduler,
            _sector_id: `${scheduler.sector}:${scheduler.id}`,
        };
    },
    fromRepo: (scheduler: InRepositoryEvaluationsScheduler): EvaluationsScheduler => {
        if (!scheduler) {
            return scheduler;
        }
        const {_sector_id, ...result} = scheduler;
        return result;
    },
};

type InRepositoryEvaluationsScheduler = EvaluationsScheduler & {
    _sector_id: string
};
