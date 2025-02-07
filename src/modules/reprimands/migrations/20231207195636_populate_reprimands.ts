import {Knex} from 'knex';
import omit from 'lodash/omit';

import config from '../../../config';
import DynamoClient from '../../../utils/dynamo-client';

export async function up(knex: Knex): Promise<void> {
    const {Items} = await documents
        .scanAll({TableName: config.reprimandsTable as string});

    const reprimands = Items.map(reprimand => omit(reprimand, ['_employee_id', '_DocKey', '_AttKey']));
    await knex(config.reprimandsMysqlTable).insert(reprimands).onConflict().ignore();

}

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
