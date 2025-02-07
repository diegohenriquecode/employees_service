import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';

import DynamoClient from '../../utils/dynamo-client';
import {UnseenItem, UnseenItemProps} from './schema';

export default class UnseenItemsRepository {
    static config(cfg: BarueriConfig, user: string) {
        return new UnseenItemsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.unseenItemsTable,
            user,
        );
    }

    async create(props: UnseenItemProps) {
        const Item: UnseenItem = {
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

    async update(current: UnseenItem, patch: Partial<UnseenItem>) {
        const Item = {
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

    async retrieve(account: string, employee: string, id: string) {
        const Key = this.getKey(account, employee, id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        const repoUnseenItem = Item as InRepositoryUnseenItem;
        return mapper.fromRepo(repoUnseenItem);
    }

    private getKey(account: string, employee: string, id: string) {
        return {
            account,
            _employee_id: `${employee}:${id}`,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
    ) {}
}

const mapper = {
    toRepo: (unseenItem: UnseenItem): InRepositoryUnseenItem => {
        if (!unseenItem) {
            return unseenItem;
        }

        return {
            ...unseenItem,
            _employee_id: `${unseenItem.employee}:${unseenItem.id}`,
        };
    },
    fromRepo: (unseenItem: InRepositoryUnseenItem): UnseenItem => {
        if (!unseenItem) {
            return unseenItem;
        }

        const {_employee_id, ...result} = unseenItem;

        return result;
    },
};

type InRepositoryUnseenItem = UnseenItem & {
    _employee_id: string
};
