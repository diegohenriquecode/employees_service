import {Context, SQSEvent} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';
import QueueService from 'utils/queues';

import UsersUpdateHistoryRepository from './repository';

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

        const payload = JSON.parse(JSON.parse(MessageBody).Message);

        if (payload.EventType === 'INSERT') {
            const {NewItem: after} = payload;
            await UsersUpdateHistoryRepository.config(config, serviceName, after.account)
                .create(null, after);
        } else if (payload.EventType === 'MODIFY') {
            const {OldItem: before, NewItem: after} = payload;
            await UsersUpdateHistoryRepository.config(config, serviceName, after.account)
                .create(before, after);
        }

        await queues.deleteMessage(record);
    }
}

const serviceName = 'sub';

const queues = QueueService.config(config);
