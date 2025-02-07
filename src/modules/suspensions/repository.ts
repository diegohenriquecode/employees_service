import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {InternalSuspension, SuspensionProps} from './schema';

export default class SuspensionsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new SuspensionsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.suspensionsTable,
            user,
            account,
        );
    }

    async create(props: SuspensionProps) {
        const Item: InternalSuspension = {
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
            ProjectionExpression: 'id,#status,employee,sector,#rank,created_at,created_by,updated_at,updated_by,#start,#end',
            ExpressionAttributeNames: {'#account': 'account', '#_employee_id': '_employee_id', '#status': 'status', '#rank': 'rank', '#start': 'start', '#end': 'end'},
            ExpressionAttributeValues: {':account': this.account, ':employee': employee},
        });

        const inRepoSuspensions = Items as InRepositorySuspension[];
        return inRepoSuspensions.map(inRepo => mapper.fromRepo(inRepo));
    }

    async countByAccount(accountId: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {'#account': 'account'},
            ExpressionAttributeValues: {':account': accountId},
        });

        const inRepoSuspensions = Items as InRepositorySuspension[];
        return inRepoSuspensions.length;
    }

    async retrieve(employee: string, id: string) {
        const Key = this.getKey(employee, id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        const inRepo = Item as InRepositorySuspension;
        return mapper.fromRepo(inRepo);
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

    async update(current: InternalSuspension, patch: Partial<InternalSuspension>) {
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

        const inRepoSuspensions = Items as InRepositorySuspension[];
        return inRepoSuspensions.map(inRepo => mapper.fromRepo(inRepo));
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    toRepo: (suspension: InternalSuspension): InRepositorySuspension => {
        if (!suspension) {
            return suspension;
        }
        return {
            ...suspension,
            _employee_id: `${suspension.employee}:${suspension.id}`,
        };
    },
    fromRepo: (suspension: InRepositorySuspension): InternalSuspension => {
        if (!suspension) {
            return suspension;
        }
        const {_employee_id, ...result} = suspension;
        return result;
    },
};

type InRepositorySuspension = InternalSuspension & {
    _employee_id: string
};
