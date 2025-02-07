import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.boolean('read');
            table.string('read_at');
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.dropColumn('read');
            table.dropColumn('read_at');
        });
}
