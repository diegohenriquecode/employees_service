const {DynamoDBClient} = require('@aws-sdk/client-dynamodb');
const {DynamoDBDocument} = require('@aws-sdk/lib-dynamodb');
const {default: Knex} = require('knex');
const Moment = require('moment');

const {config} = require('./config');
const {randomInt, scanAll} = require('./utils');

const knex = Knex(config);

const documents = DynamoDBDocument.from(new DynamoDBClient({
    endpoint: 'http://localhost:8080',
    region: 'localhost',
}))

module.exports = {
    /**
     * @param {number} amt
     */
    async seed(amt) {
        /** @type {User[]} */
        const users = (await scanAll(documents, {TableName: 'BarueriUsers'}));
        const feedbacks = [];
        for (let i = 0; i < amt; i++) {
            const id = `feedback-${i}`;
            const user = users[randomInt(0, users.length / 10)];

            const now = Moment();

            /** @type {Feedback} */
            const feedback = {
                account: 'pioneer',
                created_at: now.subtract(randomInt(1, 15), 'days').toISOString(),
                created_by: 'manager',
                employee: user.id,
                id,
                rank: user.rank,
                read: Math.random() > 0.7,
                read_at: '',
                sector: user.sector,
                text: 'whatever',
                type: Math.random() > 0.5 ? 'compliment' : 'guidance',
                updated_at: '',
                updated_by: '',
            };
            feedbacks.push(feedback);
        }
        await knex('BarueriFeedbacks').insert(feedbacks).onConflict().ignore();
        console.log('created feedbacks');
    }
}

/** @typedef {import('../../src/modules/users/schema').User} User */
/** @typedef {import('../../src/modules/feedbacks/schema').Feedback} Feedback */