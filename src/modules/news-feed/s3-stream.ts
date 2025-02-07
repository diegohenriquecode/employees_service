
import {KMSThrottlingException} from '@aws-sdk/client-sns';
import {Context, S3Event, S3EventRecord} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import {randomSleep} from 'utils/time';

export async function handler(event:S3Event, context:Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        for (const record of event.Records) {
            await recordHandler(record);
        }
    } catch (e) {
        console.error(e);
        if (e instanceof KMSThrottlingException) {
            await ErrorsNotification.publish(context);
        }
        throw e;
    }
}

async function recordHandler({s3, eventName}: S3EventRecord) {

    for (let i = 1; i <= MaxTries; i++) {
        try {
            return await events.publish(process.env.EVENT_TYPE as string, 1, 's3', {
                EventType: eventName,
                Object: s3.object,
            });
        } catch (e) {
            if (e instanceof KMSThrottlingException && i <= MaxTries) {
                await randomSleep(1000 * i);
                continue;
            }
            throw e;
        }
    }
}

const events = EventsTopicService.config(config);
const MaxTries = 5;
