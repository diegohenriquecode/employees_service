import config from 'config';

import DynamoClient from '../../../utils/dynamo-client';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable});
    for (const account of accounts) {
        const {Items: allEmployees} = await documents.queryAll({
            TableName: config.usersTable,
            KeyConditionExpression: 'account = :account',
            ExpressionAttributeValues: {':account': account.id},
        });

        for (const employee of allEmployees) {
            if (!employee.manager_of && employee.sector !== employee.subordinate_to) {
                await documents.update({
                    TableName: config.usersTable,
                    Key: {account: account.id, id: employee.id},
                    UpdateExpression: 'SET subordinate_to = :sector',
                    ExpressionAttributeValues: {':sector': employee.sector},
                });
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
