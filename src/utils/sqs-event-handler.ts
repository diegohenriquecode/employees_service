import {Context, SQSEvent, SQSRecord} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';

import {DDBStreamEvent} from './dynamo-client';
import QueueService from './queues';

const sqsEventHandler = async (event: SQSEvent, context: Context, fn: (record: SQSRecord, context: Context) => Promise<void>) => {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        for (const record of event.Records) {
            await fn(record, context);
            await QueueService.config(config).deleteMessage(record);
        }
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

export function changedTo(event: DDBStreamEvent, field: string, value: unknown) {
    return (event.OldItem?.[field] !== value && event.NewItem?.[field] === value);
}

export default sqsEventHandler;
