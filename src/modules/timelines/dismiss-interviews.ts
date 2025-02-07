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
            const {NewItem: dismissInterview} = payload;
            await actions.create(
                dismissInterview.account,
                dismissInterview.employee,
                TimelineType,
                dismissInterview.id,
                dismissInterview.created_at,
                {dismissed_at: dismissInterview.dismissed_at, created_by: dismissInterview.created_by},
            );
        }

        await queues.deleteMessage(record);
    }
}

const TimelineType = 'DismissInterview';

const actions = TimelinesService.config(config, 'timeline-dismiss-interviews-handler');
const queues = QueueService.config(config);
