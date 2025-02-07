const {default: Knex} = require('knex');
const omit = require('lodash/omit');

const evaluations = require('../ddb-tables/evaluations.json');
const {config} = require('./config');

const knex = Knex(config);

module.exports = {
    /**
     * @param {number} amt
     */
    async seed() {
        await knex('BarueriEvaluations').insert(evaluations.map(toSql)).onConflict().ignore();
        console.log('created evaluations');
    }

}

function toSql(evaluation) {
    return omit(evaluation, omitFields);
}

const omitFields = [
    '_employee_id',
    'emotional',
    'technical',
    'criteria',
    'observations',
];