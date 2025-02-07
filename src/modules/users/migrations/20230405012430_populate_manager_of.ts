import config from 'config';

import DynamoClient from '../../../utils/dynamo-client';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable as string});
    for (const account of accounts) {
        const {Items: allSectors} = await documents.queryAll({
            TableName: config.orgSectorsTable as string,
            KeyConditionExpression: 'account = :account',
            ExpressionAttributeValues: {':account': account.id},
        });
        const sectors = allSectors
            .filter(s => s.manager && !s.removed);
        for (const sector of sectors) {
            const [that, upper] = sector.path.split(';').reverse();
            const sectorId = upper || that;
            await documents.update({
                TableName: config.usersTable as string,
                Key: {account: account.id, id: sector.manager},
                UpdateExpression: 'SET sector = :sector, manager_of = :mgm',
                ExpressionAttributeValues: {':sector': sectorId, ':mgm': sector.id},
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
