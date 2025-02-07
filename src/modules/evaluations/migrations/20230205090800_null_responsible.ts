import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.string('responsible').nullable().alter();
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.evaluationsMysqlTable, table => {
            table.string('responsible').notNullable().alter();
        });
}
