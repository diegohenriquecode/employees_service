import config from 'config';

import DynamoClient from '../../../utils/dynamo-client';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable as string});
    for (const account of accounts) {
        const {Item: rootSector} = await documents.get({
            TableName: config.orgSectorsTable,
            Key: {account: account.id, id: 'root'},
        });

        if (!rootSector || !rootSector.manager) {
            continue;
        }

        const {Item: rootManager} = await documents.get({
            TableName: config.usersTable,
            Key: {account: account.id, id: rootSector.manager},
        });

        if (!rootManager || rootManager.disabled) {
            continue;
        }

        const sectorAtSectors = Object.keys(rootManager.sectors).includes(rootSector.id);

        if (!sectorAtSectors) {
            await documents.update({
                TableName: config.orgSectorsTable as string,
                Key: {account: account.id, id: rootSector.id},
                UpdateExpression: 'SET manager = :manager',
                ExpressionAttributeValues: {':manager': null},
            });
            continue;
        }

        if (!rootManager.sectors[rootSector.id].is_manager) {
            await documents.update({
                TableName: config.usersTable as string,
                Key: {account: account.id, id: rootManager.id},
                UpdateExpression: 'SET #sectors.#sector_id.#is_manager = :is_manager',
                ExpressionAttributeNames: {
                    '#sectors': 'sectors',
                    '#sector_id': rootSector.id,
                    '#is_manager': 'is_manager',
                },
                ExpressionAttributeValues: {':is_manager': true},
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
