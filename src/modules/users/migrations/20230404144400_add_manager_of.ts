import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.string('manager_of');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable(config.usersTable, function (table) {
        table.dropColumn('manager_of');
    });
}
