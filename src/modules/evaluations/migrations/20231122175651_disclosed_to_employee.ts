import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.integer('disclosed_to_employee');
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.dropColumn('disclosed_to_employee');
        });
}
