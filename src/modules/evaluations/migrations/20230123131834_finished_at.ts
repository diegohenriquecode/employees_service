import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.string('finished_at');
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.dropColumn('finished_at');
        });
}
