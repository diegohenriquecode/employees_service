import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable(config.notesTable, table => {
            table.string('id').primary();

            table.string('account').notNullable();
            table.string('user').notNullable();
            table.text('text').notNullable();

            table.string('created_at').notNullable();
            table.string('created_by').notNullable();
            table.string('updated_at').notNullable();
            table.string('updated_by').notNullable();
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTable(config.notesTable);
}
