import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable(config.usersHierarchicalMysqlTable, table => {
            table.string('account').notNullable();
            table.string('user_id').notNullable();
            table.string('sector').notNullable();

            table.string('rank');
            table.integer('hierarchical_level');
            table.string('subordinate_to');
            table.string('subordinate_sector');
            table.string('boss_rank');
            table.integer('boss_hierarchical_level');
            table.boolean('disabled_user');
            table.boolean('disabled_rank');

            table.string('created_at');
            table.string('created_by');
            table.string('updated_at');
            table.string('updated_by');

            table.primary(['account', 'user_id', 'sector']);
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTable(config.usersHierarchicalMysqlTable);
}
