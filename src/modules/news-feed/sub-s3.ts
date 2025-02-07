import {Context, SQSEvent} from 'aws-lambda';
import {AppUser} from 'modules/users/schema';
import {S3StreamEvent} from 'utils/dynamo-client';
import subscriptionHandler from 'utils/subscriptions';

import config from '../../config';
import NewsFeedService from './service';

export const handler = (event: SQSEvent, context: Context) => subscriptionHandler(event, context, _handler);

async function _handler(record: S3StreamEvent) {
    const filePath = record.Object.key;
    const [, accountId, newsFeedId, fileType] = filePath.split('/');
    if (fileType.includes('image')) {
        await NewsFeedService.config(config, {id: MODULE} as AppUser, accountId)
            .confirmImageUpload(newsFeedId, filePath);
    } else if (fileType.includes('attachment')) {
        await NewsFeedService.config(config, {id: MODULE} as AppUser, accountId)
            .confirmAttachmentUpload(newsFeedId, filePath);
    }

}

const MODULE = 'sub-s3-stream';
