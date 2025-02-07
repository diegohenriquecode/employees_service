import {Context, ScheduledEvent} from 'aws-lambda';
import config from 'config';
import AccountsRepository from 'modules/accounts/repository';
import {ErrorsNotification} from 'modules/errors/errors';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import {AccountType, isFullAddress} from '../accounts/schema';
import BoletosService from './service';

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
    const accounts = (await accountsRepository.list())
        .filter(account => !account.disabled)
        .filter(account => !account.is_demo && account.type == AccountType.PAID)
        .map(account => account.id);

    for (const account of accounts) {
        const accountDetails = await accountsRepository.retrieve(account);

        if (!accountDetails.company_name ||
            !accountDetails.cnpj ||
            !accountDetails.value_per_user ||
            !accountDetails.close_invoice ||
            !accountDetails.min_users_number ||
            !accountDetails.payment_day ||
            !isFullAddress(accountDetails.address)) {
            console.warn(`Account ${accountDetails.name} doesnt have required fields to generate a boleto`);
            continue;
        }

        const dayOfMonth = moment().date();
        if (dayOfMonth === accountDetails.close_invoice) {
            const activeUsers = await (UsersService.config(config, {id: 'job-boleto'} as User, account)).countEnabledByAccount(account);
            const multiplier = activeUsers > accountDetails.min_users_number ? activeUsers : accountDetails.min_users_number;
            const boletoValue = multiplier * Number(accountDetails.value_per_user);

            await BoletosService.config(config, 'job-boleto')
                .create(boletoValue, moment().toISOString(), accountDetails);
        }
    }
}

const accountsRepository = AccountsRepository.config(config, '');
