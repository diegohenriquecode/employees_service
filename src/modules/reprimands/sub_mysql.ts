import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import ReprimandsMysqlRepository from './repository.mysql';

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
            const {NewItem: reprimand} = payload;
            await repository.create(reprimand);
        } else if (payload.EventType === 'MODIFY') {
            const {OldItem: reprimand, NewItem: patch} = payload;
            await repository.update(reprimand, patch);
        } else if (payload.EventType === 'REMOVE') {
            const {OldItem: reprimand} = payload;
            await repository.remove(reprimand.id);
        }

        await queues.deleteMessage(record);
    }
}

const repository = ReprimandsMysqlRepository.config(config);
const queues = QueueService.config(config);
