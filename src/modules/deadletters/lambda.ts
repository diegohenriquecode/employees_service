import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';
import {v4 as uuid} from 'uuid';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import DeadLettersRepository from './repository';

export async function handler(event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event, context);
    } catch (e) {
        await ErrorsNotification.publish(context);
        throw e;
    }
}

async function _handler(event: SQSEvent, context: Context) {
    for (const record of event.Records) {
        const {
            attributes: {MessageGroupId},
            body: MessageBody,
        } = record;
        await handleMessage(MessageGroupId, MessageBody, context);
        await queues.deleteMessage(record);
    }
}

async function handleMessage(MessageGroupId: string | undefined, Message: string, context: Context) {
    const msg = JSON.parse(Message);
    await deadletters.create({
        id: uuid(),
        date: new Date().toISOString(),
        lambdaContext: context,
        body: msg,
        MessageGroupId,
    });
}

const deadletters = DeadLettersRepository.config(config);
const queues = QueueService.config(config);
