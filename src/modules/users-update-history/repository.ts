import {BarueriConfig} from 'config';
import fastjsonpatch from 'fast-json-patch';
import {User} from 'modules/users/schema';
import moment from 'moment';

import DynamoClient from '../../utils/dynamo-client';
import {UsersUpdateHistoryListProps, UserUpdateHistoryItem} from './schema';

export default class UsersUpdateHistoryRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new UsersUpdateHistoryRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.usersUpdateHistoryTable,
            user,
            account,
        );
    }

    async list(user: string, props: ListProps) {
        const {Items = [], LastEvaluatedKey} = await this.documents.query({
            ExclusiveStartKey: props.next && JSON.parse(props.next),
            ExpressionAttributeNames: {
                '#account': 'account',
                '#user_created_at': 'user_created_at',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':from': `${user}:${props.from.toISOString()}`,
                ':to': `${user}:${props.to.toISOString()}`,
            },
            KeyConditionExpression: '#account = :account and #user_created_at between :from and :to',
            Limit: props.pageSize,
            ScanIndexForward: false,
            TableName: this.table,
        });

        return {
            items: (Items as InternalUserUpdateHistoryItem[]).map(Mapper.from),
            next: JSON.stringify(LastEvaluatedKey),
        };
    }

    async create(before: User | null, after: User) {
        const Item: UserUpdateHistoryItem = {
            account: this.account,
            user: after.id,

            before,
            changed_at: after.updated_at,
            changed_by: after.updated_by,
            changes: fastjsonpatch.compare(before || {}, after),

            created_at: moment().toISOString(),
            created_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: Mapper.to(Item),
        });

        return Item;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

class Mapper {
    static to(item: UserUpdateHistoryItem): InternalUserUpdateHistoryItem {
        if (!item) {
            return item;
        }
        return {
            ...item,
            user_created_at: `${item.user}:${item.created_at}`,
        };
    }

    static from(item: InternalUserUpdateHistoryItem): UserUpdateHistoryItem {
        if (!item) {
            return item;
        }
        const {user_created_at, ...result} = item;
        return result;
    }
}

type InternalUserUpdateHistoryItem = UserUpdateHistoryItem & {
    user_created_at: string
};

type ListProps = Omit<UsersUpdateHistoryListProps, 'user'>;
