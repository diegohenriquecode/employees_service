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
            if (employee.manager_of) {
                await documents.update({
                    TableName: config.usersTable,
                    Key: {account: account.id, id: employee.id},
                    UpdateExpression: 'SET sector = :sector, subordinate_to = :subordinate_to',
                    ExpressionAttributeValues: {':sector': employee.manager_of, ':subordinate_to': employee.sector},
                });
            } else {
                await documents.update({
                    TableName: config.usersTable,
                    Key: {account: account.id, id: employee.id},
                    UpdateExpression: 'SET subordinate_to = :subordinate_to',
                    ExpressionAttributeValues: {':subordinate_to': employee.sector},
                });
            }
        }
    }
}

export async function down(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable});
    for (const account of accounts) {
        const {Items: allEmployees} = await documents.queryAll({
            TableName: config.usersTable,
            KeyConditionExpression: 'account = :account',
            ExpressionAttributeValues: {':account': account.id},
        });

        for (const employee of allEmployees) {
            let updateExpression = 'REMOVE subordinate_to';
            let expressionAttributeValues = undefined;

            if (employee.subordinate_to !== employee.sector) {
                updateExpression = updateExpression + ', SET sector = :sector';
                expressionAttributeValues = {':sector': employee.subordinate_to};
            }

            await documents.update({
                TableName: config.usersTable,
                Key: {account: account.id, id: employee.id},
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues,
            });
        }
    }
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
