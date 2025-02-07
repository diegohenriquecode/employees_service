import {Context, S3Event, S3EventRecord} from 'aws-lambda';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import AccountsService from './service';

export const handler = async function (event: S3Event, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        for (const s3Record of event.Records) {
            await handleS3Record(s3Record);
        }
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

async function handleS3Record(record: S3EventRecord) {
    await AccountsService.config(config, 's3-stream')
        .confirmUpload(record.s3.object.key);
}
