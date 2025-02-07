import {Knex} from 'knex';

import config from '../../../config';
import PendingActionsRepository from '../repository';
import {PendingAction} from '../schema';

export async function up(knex: Knex): Promise<void> {
    const disabledUsers = await knex(config.usersMysqlTable)
        .where('disabled', '=', true);
    for (const user of disabledUsers) {
        const repository = PendingActionsRepository.config(config, user.id);
        const pendingActions: PendingAction[] = await repository.listRelatedToEmployee(user.account, user.id);
        for (const pendingAction of pendingActions) {
            await repository.patch(pendingAction, 'disabled', true);
        }
    }
}

export async function down(): Promise<void> {
    return;
}
