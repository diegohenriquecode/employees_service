import {Knex} from 'knex';
import {isEmpty, omit} from 'lodash';

import config from '../../../config';
import DynamoClient from '../../../utils/dynamo-client';

export async function up(knex: Knex): Promise<void> {
    const {Items} = await documents
        .scanAll({TableName: config.suspensionsTable as string});

    if (Items.length === 0) {
        return;
    }

    const suspensions = Items.map(s => omit(s, ['_employee_id', '_DocKey', '_AttKey']));
    if (isEmpty(suspensions)) {
        return;
    }
    await knex(config.suspensionsMysqlTable).insert(suspensions).onConflict().ignore();

}

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
