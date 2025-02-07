import {Knex} from 'knex';
import {isEmpty, omit} from 'lodash';

import config from '../../../config';
import DynamoClient from '../../../utils/dynamo-client';

export async function up(knex: Knex): Promise<void> {
    const {Items} = await documents
        .scanAll({TableName: config.dismissInterviewsTable as string});

    const dismissInterviews = Items.map(s => ({
        ...omit(s, ['_employee_id', 'details']),
    }));

    if (isEmpty(dismissInterviews)) {
        return;
    }

    await knex(config.dismissInterviewsMysqlTable).insert(dismissInterviews).onConflict().ignore();
}

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
