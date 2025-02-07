import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.string('rank').nullable().alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.string('rank').notNullable().alter();
    });
}
