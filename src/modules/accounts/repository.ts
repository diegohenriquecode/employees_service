import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {Account, AccountProps, AccountStatus} from './schema';

export default class AccountsRepository {
    static config(cfg: BarueriConfig, user: string) {
        return new AccountsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.accountsTable,
            cfg.accountsBySubdomain,
            user,
        );
    }

    async create(props: AccountProps) {
        const timezone = props.timezone;
        const Item: Omit<Account, 'lang' | 'colors'> = {
            id: uuidV4(),
            ...props,
            timezone,
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
                throw new ConflictError();
            }
            throw e;
        }

        return mapper.fromRepo(Item as InRepoAccount);
    }

    async update(current: Account, patch: Partial<AccountProps>) {
        const Item: Account = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return mapper.fromRepo(Item as InRepoAccount);
    }

    async patch(id: string, fieldName: string, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: {id},
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async list() {
        const {Items} = await this.documents.scanAll({
            TableName: this.table,
        });
        return Items.map(Item => mapper.fromRepo(Item as InRepoAccount));
    }

    async listComercial() {
        const {Items} = await this.documents.scanAll({
            TableName: this.table,
            FilterExpression: '#is_demo = :is_demo OR attribute_not_exists(#is_demo)',
            ExpressionAttributeNames: {'#is_demo': 'is_demo'},
            ExpressionAttributeValues: {':is_demo': false},
        });
        return Items.map(Item => mapper.fromRepo(Item as InRepoAccount));
    }

    async listDemo() {
        const {Items} = await this.documents.scanAll({
            TableName: this.table,
            FilterExpression: '#is_demo = :is_demo',
            ExpressionAttributeNames: {'#is_demo': 'is_demo'},
            ExpressionAttributeValues: {':is_demo': true},
        });
        return Items.map(Item => mapper.fromRepo(Item as InRepoAccount));
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {id},
        });
        return mapper.fromRepo(Item as InRepoAccount);
    }

    async findBySubdomain(subdomain: string) {
        const {Items} = await this.documents.query({
            TableName: this.table,
            IndexName: this.bySubdomainIndex,
            KeyConditionExpression: '#subdomain = :subdomain',
            ExpressionAttributeNames: {'#subdomain': 'subdomain'},
            ExpressionAttributeValues: {':subdomain': subdomain},
        });
        if (Items) {
            return mapper.fromRepo(Items[0] as InRepoAccount);
        }
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private bySubdomainIndex: string,
        private user: string,
    ) {}

}

const mapper = {
    fromRepo: (account: InRepoAccount): Account => {
        if (!account) {
            return account;
        }

        return {
            ...account,
            lang: account.lang ?? 'ptBR',
            timezone: account.timezone ?? 'America/Sao_Paulo',
            status: account.status ?? AccountStatus.ready,
            colors: account.colors ?? {
                primary: '#00619E',
                secondary: '#575757',
                accent: '#88BD3F',
            },
        };
    },
};

type InRepoAccount = PartialBy<Account, 'lang' | 'colors'>;
