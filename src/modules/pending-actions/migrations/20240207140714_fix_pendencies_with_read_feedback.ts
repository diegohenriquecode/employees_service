import config from 'config';

import DynamoClient from '../../../utils/dynamo-client';
import {PendingActionsTypes} from '../schema';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable as string});
    for (const account of accounts) {
        const {Items: pendencies} = await documents.queryAll({
            TableName: config.pendingActionsTable,
            KeyConditionExpression: '#account = :account',
            FilterExpression: '#type = :feedbackNotRead AND (#done = :done OR attribute_not_exists(#done))',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#type': 'type',
                '#done': 'done',
            },
            ExpressionAttributeValues: {
                ':account': account.id,
                ':feedbackNotRead': PendingActionsTypes.FeedbackNotRead,
                ':done': false,
            },
        });

        for (const pendency of pendencies) {
            const {Item: feedback} = await documents.get({
                TableName: config.feedbacksTable,
                Key: {account: account.id, _employee_id: `${pendency.employee}:${pendency.id}`},
            });

            if (feedback && feedback.read) {
                await documents.update({
                    TableName: config.pendingActionsTable,
                    Key: {
                        account: account.id,
                        _EmployeeDateTypeId: pendency._EmployeeDateTypeId,
                    },
                    UpdateExpression: 'SET #done = :done',
                    ExpressionAttributeNames: {'#done': 'done'},
                    ExpressionAttributeValues: {':done': true},
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
