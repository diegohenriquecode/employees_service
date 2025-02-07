import Knex from 'knex';

import dbConfig from '../../../knexfile';
import appConfig from '../../config';

const db = Knex(dbConfig);

db.on('query', (data) => {
    if (appConfig.debug) {
        console.log('query:', data);
    }
});

db.on('query-error', (error, data) => {
    console.error('error:', error);
    if (!appConfig.debug) {
        console.error(data);
    }
});

db.on('query-response', (response, _data, _builder) => {
    if (appConfig.debug) {
        console.log('query-response:', response);
    }
});

export default db;
