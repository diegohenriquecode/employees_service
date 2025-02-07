import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.json('working_days');
        table.integer('monthly_hours');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.dropColumn('working_days');
        table.dropColumn('monthly_hours');
    });
}
