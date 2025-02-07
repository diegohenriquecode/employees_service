import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.string('birthday');
        table.string('effectivated_at');
        table.boolean('effective').defaultTo(false);
        table.string('dismissed_at');
        table.string('hired_at');
        table.string('register');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.dropColumn('birthday');
        table.dropColumn('effectivated_at');
        table.dropColumn('effective');
        table.dropColumn('dismissed_at');
        table.dropColumn('hired_at');
        table.dropColumn('register');
    });
}
