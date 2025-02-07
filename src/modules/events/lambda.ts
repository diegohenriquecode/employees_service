import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import EventsRepository from './repository';

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
            attributes: {MessageGroupId},
            body: MessageBody,
        } = record;

        const {MessageId, Subject, Message, Timestamp, MessageAttributes} = JSON.parse(MessageBody);
        await events.create({
            MessageId,
            Subject,
            Timestamp,
            Message,
            MessageAttributes: parsedMessageAttributes(MessageAttributes),
            MessageGroupId,
        });

        await queues.deleteMessage(record);
    }
}

const events = EventsRepository.config(config);

function parsedMessageAttributes(attributes: any) {
    return Object.keys(attributes)
        .map(key => ({[key]: parsedValue(attributes[key])}))
        .reduce((obj, field) => Object.assign(obj, field), {});
}

function parsedValue(attr: any) {
    if (attr.Type === 'String') {
        return attr.Value.toString();
    }
    if (attr.Type === 'Number') {
        return parseFloat(attr.Value);
    }
    // @ToDo: adicionar suporte a "Binary" e "String.Array"
    throw new Error(`Attributo de tipo desconhecido: ${attr.Type}`);
}

const queues = QueueService.config(config);
