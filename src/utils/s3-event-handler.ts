import {Context, S3Event, S3EventRecord} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';

const s3EventHandler = async (event: S3Event, context: Context, fn: (record: S3EventRecord, context: Context) => Promise<void>) => {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        for (const record of event.Records) {
            await fn(record, context);
        }
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

export default s3EventHandler;
