import config from 'config';
import {Knex} from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable(config.trainingProgressesTable, table => {
            table.string('training').notNullable();
            table.string('employee').notNullable();
            table.string('account').notNullable();

            table.json('topics');
            table.integer('progress');

            table.string('created_at');
            table.string('created_by');
            table.string('updated_at');
            table.string('updated_by');

            table.primary(['account', 'training', 'employee']);
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTable(config.trainingProgressesTable);
}
