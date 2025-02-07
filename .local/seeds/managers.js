const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {DynamoDBDocument} = require('@aws-sdk/lib-dynamodb');

const {randomInt, scanAll} = require('./utils');

const documents = DynamoDBDocument.from(new DynamoDBClient({
    endpoint: 'http://localhost:8080',
    region: 'localhost',
}))

module.exports = {
    async seed() {
        /** @type {{Items: Sector[]}} */
        const sectors = await scanAll(documents, {TableName: 'BarueriOrgSectors'})
        for (const sector of sectors) {
            if (Math.random() > 0.9 || sector.manager) {
                continue;
            }

            const users = (await scanAll(documents, {TableName: 'BarueriUsers'}))
                .filter(user => user.sector === sector.id);

            if (!users.length) {
                continue;
            }
            const manager = users[randomInt(0, users.length - 1)].id;
            await documents.put({Item: {...sector, manager}, TableName: 'BarueriOrgSectors'});
        }

        await handleManager('deepmanager', sectors);

        console.log('created managers');
    }
}

async function handleManager(id, sectors) {
    const {Item: manager} = await documents.get({TableName: 'BarueriUsers', Key: {account: 'pioneer', id}});
    const sector = sectors.find(i => i.id === manager.sector);
    await documents.put({Item: {...sector, manager: manager.id}, TableName: 'BarueriOrgSectors'});
}

/** @typedef {import('../../src/modules/orgchart/schema').Sector} Sector */