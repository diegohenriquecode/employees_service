import {Context, SQSEvent} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';
import QueueService from 'utils/queues';

import {DDBStreamEvent} from '../../utils/dynamo-client';
import {changedTo} from '../../utils/sqs-event-handler';
import {PendingAction, PendingActionsTypes} from './schema';
import PendingActionsService from './service';

export const handler = async function (event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event);
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

async function _handler(event: SQSEvent) {
    for (const record of event.Records) {
        const {
            body: MessageBody,
        } = record;

        const payload = JSON.parse(JSON.parse(MessageBody).Message) as DDBStreamEvent<PendingAction>;

        if (!payload.OldItem) {
            continue;
        }

        if (payload.EventType === 'MODIFY' && changedTo(payload, 'done', true)) {
            const {OldItem: removed} = payload;

            const idToDelete = `${removed.id}!`;
            const pendenciesToSetDone = await PendingActionsService.config(config, 'sub-pending-actions', removed.account)
                .listByTypeAndId(removed.account, PendingActionsTypes.LatePendingActionType, idToDelete);

            for (const pendencyToSetDone of pendenciesToSetDone) {
                await PendingActionsService.config(config, 'sub-pending-actions', pendencyToSetDone.account)
                    .setDoneWithAction(pendencyToSetDone);
            }
        } else if ((payload.EventType === 'REMOVE' || (payload.EventType === 'MODIFY' && changedTo(payload, 'disabled', true)))) {
            const {OldItem: removed} = payload;

            const idToDelete = `${removed.id}!`;
            const pendenciesToDelete = await PendingActionsService.config(config, 'sub-pending-actions', removed.account)
                .listByTypeAndId(removed.account, PendingActionsTypes.LatePendingActionType, idToDelete);

            for (const pendencyToDelete of pendenciesToDelete) {
                await PendingActionsService.config(config, 'sub-pending-actions', pendencyToDelete.account)
                    .deleteWithAction(pendencyToDelete);
            }
        }

        await queues.deleteMessage(record);
    }
}

const queues = QueueService.config(config);
