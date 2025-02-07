import {Context, S3Event, S3EventRecord} from 'aws-lambda';
import {AppUser} from 'modules/users/schema';
import s3EventHandler from 'utils/s3-event-handler';

import config from '../../config';
import TrainingsService from './service';

export const handler = (event: S3Event, context: Context) => s3EventHandler(event, context, _handler);

async function _handler(record: S3EventRecord) {
    const [, accountId] = record.s3.object.key.split('/');

    await TrainingsService.config(config, {id: MODULE} as AppUser, accountId)
        .confirmThumbnailUpload(record.s3.object.key);
}

const MODULE = 's3-stream';
