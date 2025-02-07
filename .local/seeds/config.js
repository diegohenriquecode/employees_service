const {MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_PASSWORD} = process.env;
module.exports = {
    config: {
        client: 'mysql2',
        connection: {
            host: MYSQL_HOST,
            port: MYSQL_PORT,
            database: MYSQL_DATABASE,
            user: MYSQL_DATABASE,
            password: MYSQL_PASSWORD,
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
            log: (message, logLevel) => console.log(`${logLevel}: ${message}`),
        },
        debug: false,
        migrations: {
            tableName: 'knex_migrations',
            extension: 'ts',
        },
    },
};
