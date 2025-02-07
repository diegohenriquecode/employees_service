const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {DynamoDBDocument} = require('@aws-sdk/lib-dynamodb');
const chunk = require('lodash/chunk');

const {randomInt} = require('./utils');

const documents = DynamoDBDocument.from(new DynamoDBClient({
    endpoint: 'http://localhost:8080',
    region: 'localhost',
}))

module.exports = {
    /**
     * @param {number} amt
     * @param {number} users
     */
    async seed(amt) {
        /** @type {Sector[]} */
        const sectors = [
            {id: 'root', path: 'root', manager: 'admin'},
            {id: 'rh', path: 'root;rh', manager: 'rh'},
            {id: 'manager', path: 'root;manager', manager: 'manager'},
        ].map(item => ({
            account: 'pioneer',
            color: '#63a3df',
            created_at: '',
            created_by: '',
            manager: 'rh',
            name: item.id,
            removed: false,
            updated_at: '',
            updated_by: '',
            ...item,
        }));
        for (let i = 0; i < amt; i++) {
            const parentPath = sectors[randomInt(0, sectors.length - 1)]?.path;
            const id = `sector-${i}`;

            /** @type {Sector} */
            const sector = {
                account: 'pioneer',
                color: '#63a3df',
                created_at: '',
                created_by: '',
                id,
                manager: '',
                name: id,
                path: `${parentPath};${id}`,
                removed: false,
                updated_at: '',
                updated_by: '',
            };
            sectors.push(sector);
        }
        const groups = chunk(sectors, 25);
        for (const group of groups) {
            await documents.batchWrite({
                RequestItems: {
                    'BarueriOrgSectors': group.map(Item => ({
                        PutRequest: {
                            Item,
                        },
                    })),
                },
            });
        }
        console.log('created sectors');
    }
}

/** @typedef {import('../../src/modules/orgchart/schema').Sector} Sector */