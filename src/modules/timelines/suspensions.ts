import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import {SUSPENSION_STATUS} from '../suspensions/schema';
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

        if (payload.EventType === 'MODIFY') {
            if (payload.OldItem?.status !== SUSPENSION_STATUS.SENT && payload.NewItem?.status === SUSPENSION_STATUS.SENT) {
                const {NewItem: suspension} = payload;
                await actions.create(
                    suspension.account,
                    suspension.employee,
                    TimelineType,
                    suspension.id,
                    suspension.created_at,
                    {sector: suspension.sector, created_by: suspension.created_by},
                );
            }
        }

        await queues.deleteMessage(record);
    }
}

const TimelineType = 'Suspension';

const actions = TimelinesService.config(config, 'timeline-suspensions-handler');
const queues = QueueService.config(config);
