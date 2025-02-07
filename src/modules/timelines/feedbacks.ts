import {Context, SQSEvent} from 'aws-lambda';
import {FeedbackStatus} from 'modules/feedbacks/schema';
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
            const {NewItem: feedback} = payload;
            if (feedback.status === FeedbackStatus.approved) {
                await actions.create(
                    feedback.account,
                    feedback.employee,
                    TimelineType,
                    feedback.id,
                    feedback.created_at,
                    {type: feedback.type, sector: feedback.sector, created_by: feedback.created_by},
                );
            }
        } else if (payload.EventType === 'MODIFY') {
            if (payload.OldItem?.status === FeedbackStatus.pending_approval && payload.NewItem?.status === FeedbackStatus.approved) {
                const {NewItem: feedback} = payload;
                await actions.create(
                    feedback.account,
                    feedback.employee,
                    TimelineType,
                    feedback.id,
                    feedback.created_at,
                    {type: feedback.type, sector: feedback.sector, created_by: feedback.created_by},
                );
            }
        }

        await queues.deleteMessage(record);
    }
}

const TimelineType = 'Feedback';

const actions = TimelinesService.config(config, 'timeline-feedbacks-handler');
const queues = QueueService.config(config);
