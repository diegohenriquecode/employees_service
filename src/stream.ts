
import {KMSThrottlingException} from '@aws-sdk/client-sns';
import {unmarshall} from '@aws-sdk/util-dynamodb';
import {Context, DynamoDBRecord, DynamoDBStreamEvent} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import {randomSleep} from 'utils/time';

export async function handler(event:DynamoDBStreamEvent, context:Context) {
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

async function recordHandler({dynamodb, eventName}: DynamoDBRecord) {
    const NewItem = dynamodb?.NewImage ? unmarshall(dynamodb.NewImage) : undefined;
    const OldItem = dynamodb?.OldImage ? unmarshall(dynamodb.OldImage) : undefined;
    const prefix = NewItem?.event || OldItem?.event;

    for (let i = 1; i <= MaxTries; i++) {
        try {
            return await events.publish(process.env.EVENT_TYPE as string, 1, 'db', {
                EventType: eventName,
                NewItem,
                OldItem,
            }, prefix);
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
