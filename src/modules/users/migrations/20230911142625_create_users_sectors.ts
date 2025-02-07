import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable(config.usersSectorsTable, table => {
            table.string('account').notNullable();
            table.string('sector').notNullable();
            table.string('user').notNullable();
            table.string('subordinate_to').notNullable();
            table.boolean('is_manager').nullable();

            table.string('created_at');

            table.primary(['account', 'user', 'sector']);
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTable(config.usersSectorsTable);
}
