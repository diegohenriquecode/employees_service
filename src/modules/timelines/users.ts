import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import TimelinesService from './service';

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
            const {NewItem: user} = payload;

            await actions.create(
                user.account,
                user.id,
                TimelineType,
                user.id,
                user.created_at,
                {},
            );
        }

        await queues.deleteMessage(record);
    }
}

const TimelineType = 'User';

const actions = TimelinesService.config(config, 'timeline-users-handler');
const queues = QueueService.config(config);
