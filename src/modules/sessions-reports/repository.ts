import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {BarueriConfig} from 'config';
import {AppUser} from 'modules/users/schema';
import moment from 'moment';

import DynamoClient from '../../utils/dynamo-client';
import {ListSessionsReportsProps, SessionsReports, SessionsReportsProps} from './schema';

export default class SessionsReportsRepository {
    static config(cfg: BarueriConfig, user: AppUser) {
        return new SessionsReportsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.sessionsReportsTable,
            user,
        );
    }

    async create(props: Omit<SessionsReportsProps, 'account'>) {
        const Item: SessionsReports = {
            ...props,
            account: this.user.account,
            created_at: moment().toISOString(),
            updated_at: moment().toISOString(),
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: DbMapper.to(Item),
                ConditionExpression: 'attribute_not_exists(#range)',
                ExpressionAttributeNames: {'#range': '_DateEmployee'},
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                return this.handleUpdatedAt(Item);
            }
            throw e;
        }

        return Item;
    }

    async handleUpdatedAt(Item: SessionsReports) {
        const updatedAt = moment().toISOString();

        const date = Item.date;
        const role = Item.employee;

        await this.documents.update({
            TableName: this.table,
            Key: {
                account: this.user.account,
                _DateEmployee: `${date}#${role}`,
            },
            UpdateExpression: 'SET updated_at = :updated_at',
            ExpressionAttributeValues: {
                ':updated_at': updatedAt,
            },
        });

        return {
            ...Item,
            updated_at: updatedAt,
        };
    }

    async list(account: string, listProps: ListSessionsReportsProps) {
        const params: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND #range between :from and :to',
            ExpressionAttributeNames: {'#account': 'account', '#range': RangeKey},
            ExpressionAttributeValues: {
                ':account': account,
                ':from': `${listProps.from.toISOString()}`,
                ':to': `${listProps.to.toISOString()}`,
            },
        };

        const {Items} = await this.documents.queryAll(params);

        return (Items as InRepositorySessionsReports[]).map(DbMapper.from);
    }

    async lastSessionActive(account: string) {
        const params: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {'#account': 'account'},
            ExpressionAttributeValues: {
                ':account': account,
            },
        };

        const {Items} = await this.documents.queryAll(params);

        if (Items.length === 0) {
            return {lastActivity: null};
        }

        const today = new Date();

        Items.sort((a, b) => {
            const diffA = Math.abs(new Date(a.updated_at).getTime() - today.getTime());
            const diffB = Math.abs(new Date(b.updated_at).getTime() - today.getTime());
            return diffA - diffB;
        });

        return {lastActivity: Items[0].updated_at};
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: AppUser,
    ) { }
}

const RangeKey = '_DateEmployee';

class DbMapper {
    static to(Item: SessionsReports): InRepositorySessionsReports {
        if (!Item) {
            return Item;
        }
        return {
            ...Item,
            [RangeKey]: `${Item.date}#${Item.employee}`,
        };
    }
    static from(Item: InRepositorySessionsReports): SessionsReports {
        if (!Item) {
            return Item;
        }
        const {[RangeKey]: _, ...result} = Item;
        return result;
    }
}

type InRepositorySessionsReports = SessionsReports & {
    [RangeKey]: string
};
