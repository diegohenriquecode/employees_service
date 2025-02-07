import {Context, SNSMessage, SQSEvent} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';

import QueueService from './queues';

export default async function subscriptionHandler<T>(event: SQSEvent, context: Context, fn: (message: T, context?: Context) => Promise<void>) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        for (const record of event.Records) {
            const {Message} = JSON.parse(record.body) as SNSMessage;
            await fn(JSON.parse(Message) as T, context);
            await QueueService.config(config).deleteMessage(record);
        }
    } catch (e) {
        console.error(e);
        if (!(e as PublishableError)?.skipPublishing) {
            await ErrorsNotification.publish(context);
        }
        throw e;
    }
}

export interface PublishableError {
    skipPublishing?: boolean
}
