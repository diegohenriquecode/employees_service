import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import CoachingRegistersMysqlRepository from './repository.mysql';

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
            await repository.create(coachingRegister);
        } else if (payload.EventType === 'MODIFY') {
            const {OldItem: coachingRegister, NewItem: patch} = payload;
            await repository.update(coachingRegister, patch);
        } else if (payload.EventType === 'REMOVE') {
            const {OldItem: coachingRegister} = payload;
            await repository.remove(coachingRegister.id);
        }
        await queues.deleteMessage(record);
    }
}

const repository = CoachingRegistersMysqlRepository.config(config);
const queues = QueueService.config(config);
