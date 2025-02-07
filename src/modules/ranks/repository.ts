import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {Rank, RankProps} from './schema';

export default class RanksRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new RanksRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.ranksTable,
            cfg.ranksByTitle,
            user,
            account,
        );
    }

    async create(props: Omit<RankProps, 'account'>) {
        const Item: Rank = {
            id: uuidV4(),
            ...props,
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

    async update(current: Rank, patch: Partial<RankProps>) {
        const Item: Rank = {
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

    async patch(id: string, fieldName: string, fieldValue: any) {
        const Key = this.getKey(id);

        await this.documents.update({
            TableName: this.table,
            Key,
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
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

        const repoRanks = Items as InRepositoryRank[];
        return repoRanks.map(repoRank => mapper.fromRepo(repoRank));
    }

    async retrieve(id: string) {
        const Key = this.getKey(id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        const repoRank = Item as InRepositoryRank;
        return mapper.fromRepo(repoRank);
    }

    async findByTitle(title: string) {
        const _title = title.toLowerCase();

        const {Items} = await this.documents.query({
            TableName: this.table,
            IndexName: this.byTitleIndex,
            KeyConditionExpression: '#account = :account AND #_title = :_title',
            ExpressionAttributeNames: {'#account': 'account', '#_title': '_title'},
            ExpressionAttributeValues: {
                ':account': this.account,
                ':_title': _title,
            },
        });
        if (Items) {
            const repoRank = Items[0] as InRepositoryRank;
            return mapper.fromRepo(repoRank);
        }
    }

    private getKey(id: string) {
        return {
            account: this.account,
            id: id,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byTitleIndex: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    toRepo: (rank: Rank): InRepositoryRank => {
        if (!rank) {
            return rank;
        }

        return {
            ...rank,
            _title: rank.title.toLowerCase(),
        };
    },
    fromRepo: (rank: InRepositoryRank): Rank => {
        if (!rank) {
            return rank;
        }

        const {_title, ...result} = rank;

        return result;
    },
};

type InRepositoryRank = Rank & {
    _title: string
};
