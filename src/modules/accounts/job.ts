import {ScheduledEvent, Context} from 'aws-lambda';
import config from 'config';
import AccountsRepository from 'modules/accounts/repository';
import {ErrorsNotification} from 'modules/errors/errors';
import moment from 'moment-timezone';

export async function handler(event: ScheduledEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler();
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
    }
}

async function _handler() {
    const rAccounts = AccountsRepository.config(config, '');

    const accounts = (await rAccounts.list()).filter(account => !account.disabled && account.expiry_date);

    for (const account of accounts) {
        const currentDate = moment.tz(account.timezone);
        if (currentDate.isAfter(moment(account.expiry_date))) {
            await rAccounts.patch(account.id, 'disabled', true);
        }
    }
}
