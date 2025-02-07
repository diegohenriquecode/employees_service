import config from 'config';
import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable(config.suspensionsMysqlTable, table => {
            table.string('account').notNullable();
            table.string('id').notNullable();

            table.string('start').notNullable();
            table.string('end').notNullable();
            table.string('description').notNullable();
            table.string('status').notNullable();

            table.string('employee').notNullable();
            table.string('sector').notNullable();
            table.string('rank');
            table.string('manager');

            table.string('created_at');
            table.string('created_by');
            table.string('updated_at');
            table.string('updated_by');

            table.primary(['account', 'id']);
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable(config.suspensionsMysqlTable);
}
