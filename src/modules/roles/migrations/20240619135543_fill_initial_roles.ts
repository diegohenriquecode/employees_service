import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import config from 'config';
import {ConflictError} from 'modules/errors/errors';
import {initialRoles} from 'modules/roles/schema';
import moment from 'moment';

import DynamoClient from '../../../utils/dynamo-client';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable});
    for (const account of accounts) {
        for (const toAdd of initialRoles) {
            const now = moment().toISOString();
            const Item = {
                id: toAdd,
                account: account.id,
                name: toAdd,
                private: toAdd === 'admin',
                permissions: [],
                created_at: now,
                updated_at: now,
                created_by: 'migration',
                updated_by: 'migration',
            };

            try {
                await documents.put({
                    TableName: config.rolesTable,
                    Item,
                    ConditionExpression: 'attribute_not_exists(id)',
                });
            } catch (e) {
                if (e instanceof ConditionalCheckFailedException) {
                    throw new ConflictError();
                }
                throw e;
            }
        }
    }
}

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
