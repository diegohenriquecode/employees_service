import {Context, SQSEvent, SQSRecord} from 'aws-lambda';

import config from '../../../config';
import {DDBStreamEvent} from '../../../utils/dynamo-client';
import sqsEventHandler, {changedTo} from '../../../utils/sqs-event-handler';
import {User} from '../../users/schema';
import PendingActionsRepository from '../repository';
import {PendingAction} from '../schema';

export const handler = (event: SQSEvent, context: Context) => sqsEventHandler(event, context, _handler);

async function _handler(record: SQSRecord) {
    const payload = JSON.parse(JSON.parse(record.body).Message) as DDBStreamEvent<User>;

    if ((payload.EventType === 'MODIFY' && changedTo(payload, 'disabled', true)) || payload.EventType === 'REMOVE') {
        const {OldItem: user} = payload;
        if (user) {
            const repository = PendingActionsRepository.config(config, user.id);
            const pendingActions: PendingAction[] = await repository.listRelatedToEmployee(user.account, user.id);
            for (const pendingAction of pendingActions) {
                await repository.patch(pendingAction, 'disabled', true);
            }
        }
    }
}
