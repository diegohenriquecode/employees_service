import {Knex} from 'knex';

import config from '../../../config';

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.feedbacksMysqlTable, table => {
            table.string('status');
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .table(config.feedbacksMysqlTable, table => {
            table.dropColumn('status');
        });
}
