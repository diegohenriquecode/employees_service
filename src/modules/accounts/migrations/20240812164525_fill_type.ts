import config from 'config';

import DynamoClient from '../../../utils/dynamo-client';
import {AccountType} from '../schema';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents.scanAll({TableName: config.accountsTable});

    for (const account of accounts) {
        if (!account.is_demo && !account.type) {
            await documents.update({
                TableName: config.accountsTable,
                Key: {id: account.id},
                UpdateExpression: 'SET #type = :type',
                ExpressionAttributeNames: {
                    '#type': 'type',
                },
                ExpressionAttributeValues: {
                    ':type': AccountType.FREE,
                },
            });
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
