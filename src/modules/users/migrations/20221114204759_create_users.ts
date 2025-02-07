import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable(config.usersTable, table => {
            table.string('account').notNullable();
            table.string('id').notNullable();

            table.string('sector').notNullable();
            table.string('username').notNullable();
            table.string('name').notNullable();
            table.string('email');
            table.string('mobile_phone');
            table.string('password');
            table.string('roles');
            table.string('scopes');
            table.boolean('disabled');
            table.string('client_id');

            table.string('created_at');
            table.string('created_by');
            table.string('updated_at');
            table.string('updated_by');

            table.primary(['account', 'id']);
            table.unique(['account', 'username'], {indexName: 'username_composite_index'});
            table.unique(['account', 'email'], {indexName: 'email_composite_index'});
            table.unique(['account', 'mobile_phone'], {indexName: 'phone_composite_index'});
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTable(config.usersTable);
}
