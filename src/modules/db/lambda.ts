import {Context} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';

import DbService from './service';

export const handler = async function (event: string, context: Context) {
    if (config.local && config.mysql.host !== '127.0.0.1') {
        console.log('not running local without host 127.0.0.1');
        return;
    }

    try {
        await _handler(event);
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

async function _handler(event: string) {
    if (event === 'up') {
        await DbService.up();
    } else if (event === 'down') {
        await DbService.down();
    } else {
        console.log(process.env.NODE_ENV);
        await DbService.migrate();
    }
}
