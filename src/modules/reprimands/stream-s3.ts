import {Context, S3Event, S3EventRecord} from 'aws-lambda';
import AccountsRepository from 'modules/accounts/repository';
import {User} from 'modules/users/schema';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import ReprimandsService from './service';

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
    const [, accountId] = record.s3.object.key.split('/');

    const account = await accounts.retrieve(accountId);

    await ReprimandsService.config(config, s3User, account)
        .confirmUpload(record.s3.object.key);
}

const s3User = {id: 's3-stream'} as User;
const accounts = AccountsRepository.config(config, '');
