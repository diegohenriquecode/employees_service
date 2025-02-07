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
            FilterExpression: '#type = :latePendingAction AND #done <> :true',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#type': 'type',
                '#done': 'done',
            },
            ExpressionAttributeValues: {
                ':account': account.id,
                ':latePendingAction': PendingActionsTypes.LatePendingActionType,
                ':true': true,
            },
        });
        for (const pendency of pendencies) {
            const sourceId = pendency.id.slice(0, -1);
            const {Items: [sourcePendency]} = await documents.queryAll({
                TableName: config.pendingActionsTable,
                IndexName: config.pendingActionsByAccountAndId,
                KeyConditionExpression: '#account = :account AND #id = :id',
                ExpressionAttributeNames: {
                    '#account': 'account',
                    '#id': 'id',
                },
                ExpressionAttributeValues: {
                    ':account': account.id,
                    ':id': sourceId,
                },
            });

            if (!sourcePendency || sourcePendency.done) {
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
