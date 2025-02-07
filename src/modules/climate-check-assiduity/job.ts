import {ScheduledEvent, Context} from 'aws-lambda';
import config from 'config';
import AccountsRepository from 'modules/accounts/repository';
import {ErrorsNotification} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import OrgSectorsRepository from 'modules/orgchart/repository';
import moment from 'moment-timezone';

import {ClimateCheckAssiduity} from './schema';

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

    const accounts = (await rAccounts.list()).filter(account => !account.disabled);

    for (const account of accounts) {
        await processAccount(account);
    }
}

async function processAccount(account: any) {
    const accountId = account.id;
    const accountTimezone = account.timezone;
    const currentDate = moment.tz(accountTimezone);

    if (currentDate.hour() === 0) {
        const date = moment.tz(accountTimezone)
            .add(-1, 'day')
            .format('YYYY-MM-DD');

        const sectors = await OrgSectorsRepository.config(config, '', accountId)
            .all({includeRemoved: false});

        for (const sector of sectors) {
            const message: ClimateCheckAssiduityEventMessage = {
                account: accountId,
                date,
                sector: sector.id,
            };

            await events
                .publish('DailyClimateCheckAssiduity', 1, 'job', JSON.stringify(message), accountId);
        }
    }
}

const events = EventsTopicService.config(config);

export type ClimateCheckAssiduityEventMessage = Omit<ClimateCheckAssiduity, 'assiduity' | 'created_at'>;
