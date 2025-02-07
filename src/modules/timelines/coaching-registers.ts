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
            const {NewItem: coachingRegister} = payload;
            await actions.create(
                coachingRegister.account,
                coachingRegister.employee,
                TimelineType,
                coachingRegister.id,
                coachingRegister.created_at,
                {type: coachingRegister.type, sector: coachingRegister.sector, created_by: coachingRegister.created_by},
            );
        }

        await queues.deleteMessage(record);
    }
}

const TimelineType = 'CoachingRegister';

const actions = TimelinesService.config(config, 'timeline-coaching-registers-handler');
const queues = QueueService.config(config);
