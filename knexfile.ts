import {Knex} from 'knex';

import config from './src/config';

const {mysql} = config;

const knexConfig: Knex.Config = {
    client: 'mysql2',
    connection: {
        host: mysql.host,
        port: parseInt(mysql.port || '0', 10),
        database: mysql.database,
        user: mysql.user,
        password: mysql.password,
        charset: 'utf8mb4',
    },
    pool: {
        min: 0,
        max: 2,
        acquireTimeoutMillis: 10000,
        createTimeoutMillis: 10000,
        idleTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        propagateCreateError: false,
        log: (message: string, logLevel: string) => console.log(`${logLevel}: ${message}`),
    },
    debug: false,
    migrations: {
        tableName: 'knex_migrations',
        extension: 'ts',
    },
};

export default knexConfig;
