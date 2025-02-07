import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {InternalReprimand, ReprimandProps} from './schema';

export default class ReprimandsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new ReprimandsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.reprimandsTable,
            user,
            account,
        );
    }

    async create(props: ReprimandProps) {
        const Item: InternalReprimand = {
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

    async listByEmployee(employee: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_employee_id, :employee)',
            ProjectionExpression: 'id,#status,employee,sector,#rank,created_at,created_by,updated_at,updated_by',
            ExpressionAttributeNames: {'#account': 'account', '#_employee_id': '_employee_id', '#status': 'status', '#rank': 'rank'},
            ExpressionAttributeValues: {':account': this.account, ':employee': employee},
        });

        const inRepoReprimands = Items as InRepositoryReprimand[];
        return inRepoReprimands.map(inRepo => mapper.fromRepo(inRepo));
    }

    async countByAccount(accountId: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {'#account': 'account'},
            ExpressionAttributeValues: {':account': accountId},
        });

        const inRepoReprimands = Items as InRepositoryReprimand[];
        return inRepoReprimands.length;
    }

    async retrieve(employee: string, id: string) {
        const Key = this.getKey(employee, id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        const inRepo = Item as InRepositoryReprimand;
        return mapper.fromRepo(inRepo);
    }

    async listByDateRange(from: string, to: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            FilterExpression: '#created_at BETWEEN :from AND :to',
            ExpressionAttributeNames: {'#account': 'account', '#created_at': 'created_at'},
            ExpressionAttributeValues: {
                ':account': this.account,
                ':from': from,
                ':to': to,
            },
        });

        const inRepoReprimands = Items as InRepositoryReprimand[];
        return inRepoReprimands.map(inRepo => mapper.fromRepo(inRepo));
    }

    private getKey(employee: string, id: string) {
        return {
            account: this.account,
            _employee_id: `${employee}:${id}`,
        };
    }

    async patch(employee: string, id: string, fieldName: string, fieldValue: any) {
        await this.documents.update({
            TableName: this.table,
            Key: this.getKey(employee, id),
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async update(current: InternalReprimand, patch: Partial<InternalReprimand>) {
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

    async delete(employee: string, id: string) {
        const Key = this.getKey(employee, id);

        await this.documents.delete({
            TableName: this.table,
            Key,
        });
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    toRepo: (reprimand: InternalReprimand): InRepositoryReprimand => {
        if (!reprimand) {
            return reprimand;
        }
        return {
            ...reprimand,
            _employee_id: `${reprimand.employee}:${reprimand.id}`,
        };
    },
    fromRepo: (reprimand: InRepositoryReprimand): InternalReprimand => {
        if (!reprimand) {
            return reprimand;
        }
        const {_employee_id, ...result} = reprimand;
        return result;
    },
};

type InRepositoryReprimand = InternalReprimand & {
    _employee_id: string
};
