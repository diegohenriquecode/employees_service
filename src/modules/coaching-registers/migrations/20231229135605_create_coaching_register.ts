import config from 'config';
import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable(config.coachingRegistersMySqlTable, table => {
            table.string('account').notNullable();
            table.string('id').notNullable();

            table.boolean('read').notNullable();
            table.string('read_at');

            table.string('sector').notNullable();
            table.string('employee').notNullable();
            table.string('rank');
            table.string('manager');

            table.integer('in_progress_todos').defaultTo(0);
            table.integer('completed_todos').defaultTo(0);

            table.string('created_at');
            table.string('created_by');
            table.string('updated_at');
            table.string('updated_by');
            table.primary(['account', 'id']);
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable(config.coachingRegistersMySqlTable);
}
