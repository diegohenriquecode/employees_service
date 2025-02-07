import {Knex} from 'knex';
import {isEmpty, omit} from 'lodash';

import config from '../../../config';
import DynamoClient from '../../../utils/dynamo-client';
import {CoachingRegisterTodo} from '../schema';

export async function up(knex: Knex): Promise<void> {
    const {Items} = await documents
        .scanAll({TableName: config.coachingRegistersTable as string});

    const coachingRegisters = Items.map(s => ({
        ...omit(s, ['_employee_id', 'todos', 'current_state', 'intended_state']),
        in_progress_todos: s.todos?.filter((t: CoachingRegisterTodo) => !t.completed).length,
        completed_todos: s.todos?.filter((t: CoachingRegisterTodo) => t.completed).length,
    }));

    if (isEmpty(coachingRegisters)) {
        return;
    }

    await knex(config.coachingRegistersMySqlTable).insert(coachingRegisters).onConflict().ignore();
}

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
