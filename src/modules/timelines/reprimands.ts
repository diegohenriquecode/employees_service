import {Context, SQSEvent} from 'aws-lambda';
import {REPRIMAND_STATUS} from 'modules/reprimands/schema';
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

        if (payload.EventType === 'MODIFY') {
            if (payload.OldItem?.status !== REPRIMAND_STATUS.SENT && payload.NewItem?.status === REPRIMAND_STATUS.SENT) {
                const {NewItem: reprimand} = payload;
                await actions.create(
                    reprimand.account,
                    reprimand.employee,
                    TimelineType,
                    reprimand.id,
                    reprimand.created_at,
                    {sector: reprimand.sector, created_by: reprimand.created_by},
                );
            }
        }

        await queues.deleteMessage(record);
    }
}

const TimelineType = 'Reprimand';

const actions = TimelinesService.config(config, 'timeline-reprimands-handler');
const queues = QueueService.config(config);
