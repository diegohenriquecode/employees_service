import {BarueriConfig} from 'config';
import {NotFoundError} from 'modules/errors/errors';
import {AppUser} from 'modules/users/schema';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {AsyncTasks, AsyncTasksProps} from './schema';

export default class AsyncTasksRepository {
    static config(cfg: BarueriConfig, user: AppUser, account: string) {
        return new AsyncTasksRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.asyncTasksTable,
            cfg.asyncTasksByAccountAndId,
            user,
            account,
        );
    }

    async retrieve(reportId: string) {
        const {Items} = await this.documents.query({
            TableName: this.table,
            IndexName: this.bySubdomainIndex,
            KeyConditionExpression: '#account = :account AND #id = :id',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#id': 'id',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':id': reportId,
            },
        });

        if (Items && Items.length) {
            return Items[0] as AsyncTasks;
        } else {
            throw new NotFoundError('Report not found');
        }
    }

    async create(props: Omit<AsyncTasksProps, 'account' | 'employee' | 'id'>, id?: string) {
        const Item: AsyncTasks = {
            ...props,
            id: id || uuidV4(),
            account: this.account,
            employee: this.user.id,
            created_at: moment().toISOString(),
            created_by: this.user.id,
            updated_at: moment().toISOString(),
            updated_by: this.user.id,
        };

        await this.documents.put({
            TableName: this.table,
            Item: DbMapper.to(Item),
            ConditionExpression: 'attribute_not_exists(id)',
        });

        return Item;
    }

    async update(current: AsyncTasks, patch: Partial<AsyncTasksProps>) {
        const Item: AsyncTasks = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user.id,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return Item;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private bySubdomainIndex: string,
        private user: AppUser,
        private account: string,
    ) { }
}

const RangeKey = '_TypeDateEmployee';

class DbMapper {
    static to(Item: AsyncTasks): InRepositoryAsyncTasks {
        if (!Item) {
            return Item;
        }
        return {
            ...Item,
            [RangeKey]: `${Item.type}#${Item.created_at}#${Item.created_by}`,
        };
    }
    static from(Item: InRepositoryAsyncTasks): AsyncTasks {
        if (!Item) {
            return Item;
        }
        const {[RangeKey]: _, ...result} = Item;
        return result;
    }
}

type InRepositoryAsyncTasks = AsyncTasks & {
    [RangeKey]: string
};
