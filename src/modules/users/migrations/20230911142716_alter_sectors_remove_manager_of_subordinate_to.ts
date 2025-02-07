import config from '../../../config';
import DynamoClient from '../../../utils/dynamo-client';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable as string});
    for (const account of accounts) {
        const {Items: users} = await documents.queryAll({
            TableName: config.usersTable,
            KeyConditionExpression: 'account = :account',
            ExpressionAttributeValues: {':account': account.id},
        });

        const now = new Date().toISOString();

        for (const user of users) {
            const isOldVersion = !user.sectors;
            if (isOldVersion) {
                await documents.update({
                    TableName: config.usersTable,
                    Key: {account: account.id, id: user.id},
                    UpdateExpression: 'SET sectors = :sectors, updated_at = :updated_at REMOVE manager_of, subordinate_to',
                    ExpressionAttributeValues: {
                        ':updated_at': now,
                        ':sectors': {
                            [user.sector]: {
                                created_at: now,
                                subordinate_to: user.subordinate_to || user.sector,
                                is_manager: user.subordinate_to ? user.sector !== user.subordinate_to : false,
                            },
                        },
                    },
                });
            }
        }
    }
}

export async function down(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable as string});
    for (const account of accounts) {
        const {Items: users} = await documents.queryAll({
            TableName: config.usersTable,
            KeyConditionExpression: 'account = :account',
            ExpressionAttributeValues: {':account': account.id},
        });

        for (const user of users) {
            const isNewVersion = !!user.sectors;
            if (isNewVersion) {
                await documents.update({
                    TableName: config.usersTable,
                    Key: {account: account.id, id: user.id},
                    UpdateExpression: 'SET subordinate_to = :subordinate_to, manager_of = :manager_of REMOVE sectors',
                    ExpressionAttributeValues: {
                        ':subordinate_to': user.sectors[user.sector]?.subordinate_to || user.sector,
                        ':manager_of': user.sectors[user.sector]?.is_manager ? user.sector : null,
                    },
                });
            }
        }
    }
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
