import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsChannel, ErrorsNotification, NotFoundError} from './errors';

export const handler = async function (event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }
    try {
        for (const record of event.Records) {
            const {
                attributes: {MessageGroupId},
                body: MessageBody,
            } = record;

            await handleMessage(MessageGroupId, MessageBody);
            await queues.deleteMessage(record);
        }
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

async function handleMessage(MessageGroupId: string | undefined, MessageBody: string) {
    if (MessageGroupId !== 'Error') {
        throw new NotFoundError(`MessageGroupId desconhecido: ${MessageGroupId}`);
    }

    const {Message} = JSON.parse(MessageBody);

    await ErrorsChannel
        .handle(MessageGroupId, Message);
}

const queues = QueueService.config(config);
