const {default: Knex} = require('knex');

const {config} = require('./config');
const {randomInt} = require('./utils');

const knex = Knex(config);

const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {DynamoDBDocument} = require('@aws-sdk/lib-dynamodb');
const chunk = require('lodash/chunk');

const documents = DynamoDBDocument.from(new DynamoDBClient({
    endpoint: 'http://localhost:8080',
    region: 'localhost',
}))

/**
 * @returns {User['role']}
 */
function getRandomRole() {
    const rnd = Math.random();
    if (rnd > 0.98) {
        return 'rh';
    } else if (rnd > 0.97) {
        return 'admin';
    } else {
        return 'employee';
    }
}

module.exports = {
    /**
     * @param {number} amt
     * @param {number} sectors
     */
    async seed(amt, sectors) {

        const now = new Date().toISOString();
        const deepManagerSector = `sector-${randomInt(sectors / 4, sectors / 2)}`;

        /** @type {User[]} */
        const usersDynamo = [
            {id: 'admin', roles: 'admin', sector: 'root', rank: 'admin', sectors: {'root': {subordinate_to: 'root', created_at: now, is_manager: false}}},
            {id: 'rh', roles: 'rh', sector: 'rh', rank: 'rh', sectors: {'rh': {subordinate_to: 'root', created_at: now, is_manager: false}}},
            {id: 'manager', roles: 'employee', sector: 'manager', rank: 'manager', sectors: {'manager': {subordinate_to: 'root', created_at: now, is_manager: true}}},
            {id: 'employee', roles: 'employee', sector: 'manager', rank: 'employee', sectors: {'manager': {subordinate_to: 'manager', created_at: now, is_manager: false}}},
            {id: 'deepmanager', roles: 'employee', sector: deepManagerSector, rank: 'manager'},

            {id: 'lpa1_manager', roles: 'employee', sector: 'lpa1', rank: 'manager', sectors: {'lpa1': {subordinate_to: 'root', created_at: now, is_manager: true}}},
            {id: 'lpa1_employee', roles: 'employee', sector: 'lpa1', rank: 'employee', sectors: {'lpa1': {subordinate_to: 'lpa1', created_at: now, is_manager: false}}},
            {id: 'lpa2_manager', roles: 'employee', sector: 'lpa2', rank: 'manager', sectors: {'lpa2': {subordinate_to: 'lpa1', created_at: now, is_manager: true}}},
            {id: 'lpa2_employee', roles: 'employee', sector: 'lpa2', rank: 'employee', sectors: {'lpa2': {subordinate_to: 'lpa2', created_at: now, is_manager: false}}},
            {id: 'lpa3_manager', roles: 'employee', sector: 'lpa3', rank: 'manager', sectors: {'lpa3': {subordinate_to: 'lpa2', created_at: now, is_manager: true}}},
            {id: 'lpa3_employee', roles: 'employee', sector: 'lpa3', rank: 'employee', sectors: {'lpa3': {subordinate_to: 'lpa3', created_at: now, is_manager: false}}},
        ].map(item => ({
            account: 'pioneer',
            client_id: '?',
            created_at: now,
            created_by: '',
            name: item.id,
            password: '',
            rank: '',
            scopes: '',
            sector: `sector-${randomInt(0, 4)}`,
            updated_at: now,
            updated_by: '',
            username: `barueri_${item.id}`,
            disabled: false,
            email: `barueri_${item.id}@febracis.com.br`,
            mobile_phone: item.id,
            ...item,
        }));

        const usersMySql = [
            {id: 'admin', roles: 'admin', sector: 'root', rank: 'admin'},
            {id: 'rh', roles: 'rh', sector: 'rh', rank: 'rh'},
            {id: 'employee', roles: 'employee', sector: 'manager', rank: 'employee'},
            {id: 'manager', roles: 'employee', sector: 'manager', rank: 'manager'},
            {id: 'deepmanager', roles: 'employee', sector: deepManagerSector, rank: 'manager'},

            {id: 'lpa1_manager', roles: 'employee', sector: 'lpa1', rank: 'manager'},
            {id: 'lpa1_employee', roles: 'employee', sector: 'lpa1', rank: 'employee'},
            {id: 'lpa2_manager', roles: 'employee', sector: 'lpa2', rank: 'manager'},
            {id: 'lpa2_employee', roles: 'employee', sector: 'lpa2', rank: 'employee'},
            {id: 'lpa3_manager', roles: 'employee', sector: 'lpa3', rank: 'manager'},
            {id: 'lpa3_employee', roles: 'employee', sector: 'lpa3', rank: 'employee'},
        ].map(item => ({
            account: 'pioneer',
            client_id: '?',
            created_at: now,
            created_by: '',
            name: item.id,
            password: '',
            rank: '',
            scopes: '',
            sector: `sector-${randomInt(0, 4)}`,
            updated_at: now,
            updated_by: '',
            username: `barueri_${item.id}`,
            disabled: false,
            email: `barueri_${item.id}@febracis.com.br`,
            mobile_phone: item.id,
            ...item,
        }));

        const relations = [
            {account: 'pioneer', user: 'admin', sector: 'root', subordinate_to: 'root', is_manager: false, created_at: now},
            {account: 'pioneer', user: 'rh', sector: 'rh', subordinate_to: 'root', is_manager: false, created_at: now},
            {account: 'pioneer', user: 'manager', sector: 'manager', subordinate_to: 'root', is_manager: true, created_at: now},
            {account: 'pioneer', user: 'employee', sector: 'manager', subordinate_to: 'manager', is_manager: false, created_at: now},
            {account: 'pioneer', user: 'deepmanager', sector: deepManagerSector, subordinate_to: 'root', is_manager: true, created_at: now},

            {account: 'pioneer', user: 'lpa1_manager', sector: 'lpa1', subordinate_to: 'root', is_manager: true, created_at: now},
            {account: 'pioneer', user: 'lpa1_employee', sector: 'lpa1',subordinate_to: 'lpa1', is_manager: false, created_at: now},
            {account: 'pioneer', user: 'lpa2_manager', sector: 'lpa2',subordinate_to: 'lpa1', is_manager: true, created_at: now},
            {account: 'pioneer', user: 'lpa2_employee', sector: 'lpa2',subordinate_to: 'lpa2', is_manager: false, created_at: now},
            {account: 'pioneer', user: 'lpa3_manager', sector: 'lpa3', subordinate_to: 'lpa2', is_manager: true, created_at: now},
            {account: 'pioneer', user: 'lpa3_employee', sector: 'lpa3',subordinate_to: 'lpa3', is_manager: false, created_at: now},
        ]

        for (let i = 0; i < amt; i++) {
            const id = `user-${i}`;
            const sector = `sector-${randomInt(0, sectors)}`;
            const toPush = {
                account: 'pioneer',
                client_id: '?',
                created_at: now,
                created_by: '',
                id,
                name: `barueri-user-${i}`,
                password: '',
                rank: '',
                roles: getRandomRole(),
                scopes: '',
                sector,
                updated_at: now,
                updated_by: '',
                username: `barueriuser${i}`,
                disabled: Math.random() > 0.97,
                email: `barueriuser${i}@febracis.com.br`,
                mobile_phone: `${i}`
            };
            usersDynamo.push({
                ...toPush,
                sectors: {
                    [sector]: {
                        subordinate_to: 'root',
                        is_manager: false,
                    }
                },
            });

            usersMySql.push(toPush);
            relations.push({
                account: 'pioneer',
                user: id,
                sector,
                subordinate_to: 'root',
                is_manager: false,
                created_at: now
            });
        }

        const groups = chunk(usersDynamo, 25);
        for (const group of groups) {
            await documents.batchWrite({
                RequestItems: {
                    'BarueriUsers': group.map(Item => ({
                        PutRequest: {
                            Item,
                        },
                    })),
                },
            });
        }

        await knex('BarueriUsers').insert(usersMySql).onConflict().ignore();
        console.log('created users');

        await knex('BarueriUsersSectors').insert(relations).onConflict().ignore();
        console.log('created relations');
    }
}

/** @typedef {import('../../src/modules/users/schema').User} User */