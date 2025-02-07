import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import {PendingActionsTypes} from './schema';
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

        const payload = JSON.parse(JSON.parse(MessageBody).Message);

        if (payload.EventType === 'INSERT') {
            const {NewItem: coachingRegister} = payload;
            await PendingActionsService.config(config, 'coaching-registers-change-handler', coachingRegister.account).create(
                coachingRegister.account,
                coachingRegister.employee,
                coachingRegister.sector,
                PendingActionsTypes.CoachingRegisterNotRead,
                coachingRegister.id,
                coachingRegister.created_at,
                {type: coachingRegister.type, sector: coachingRegister.sector, created_by: coachingRegister.created_by},
            );
        } else if (payload.EventType === 'MODIFY') {
            if (!payload.OldItem?.read && payload.NewItem?.read) {
                const {NewItem: coachingRegister} = payload;
                await PendingActionsService.config(config, 'coaching-registers-change-handler', coachingRegister.account).setDone(
                    coachingRegister.account,
                    coachingRegister.employee,
                    PendingActionsTypes.CoachingRegisterNotRead,
                    coachingRegister.id,
                );
            }
        } else {
            const {OldItem: coachingRegister} = payload;
            if (!coachingRegister.read) {
                await PendingActionsService.config(config, 'coaching-registers-change-handler', coachingRegister.account).setDone(
                    coachingRegister.account,
                    coachingRegister.employee,
                    PendingActionsTypes.CoachingRegisterNotRead,
                    coachingRegister.id,
                );
            }
        }

        await queues.deleteMessage(record);
    }
}

const queues = QueueService.config(config);
