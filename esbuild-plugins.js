/* eslint-disable @typescript-eslint/no-var-requires */
const ignorePlugin = require('esbuild-plugin-ignore');
const {importPatternPlugin} = require('esbuild-plugin-import-pattern');

module.exports = [
    importPatternPlugin(),
    ignorePlugin([{
        resourceRegExp: /tedious|sqlite3|mariadb|oracledb|pg|pg-query-stream$/,
        contextRegExp: /node_modules\/knex/,
    }]),
];
