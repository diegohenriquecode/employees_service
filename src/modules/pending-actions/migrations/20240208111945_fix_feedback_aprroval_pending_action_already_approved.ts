import config from 'config';
import {FeedbackStatus} from 'modules/feedbacks/schema';

import DynamoClient from '../../../utils/dynamo-client';
import {PendingActionsTypes} from '../schema';
export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable as string});
    for (const account of accounts) {
        const {Items: pendencies} = await documents.queryAll({
            TableName: config.pendingActionsTable,
            KeyConditionExpression: '#account = :account',
            FilterExpression: '#type = :feedbackPendingApproval AND #done <> :true',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#type': 'type',
                '#done': 'done',
            },
            ExpressionAttributeValues: {
                ':account': account.id,
                ':feedbackPendingApproval': PendingActionsTypes.FeedbackPendingApproval,
                ':true': true,
            },
        });
        for (const pendency of pendencies) {
            const {Item: feedback} = await documents.get({
                TableName: config.feedbacksTable,
                Key: {account: account.id, _employee_id: `${pendency.data.employee}:${pendency.id}`},
            });
            if (feedback && feedback.status === FeedbackStatus.approved) {
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
