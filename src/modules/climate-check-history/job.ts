import {ScheduledEvent, Context} from 'aws-lambda';
import config from 'config';
import AccountsRepository from 'modules/accounts/repository';
import {ClimateCheckHistoryItemType} from 'modules/climate-check-history/schema';
import {ErrorsNotification} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import OrgSectorsRepository from 'modules/orgchart/repository';
import moment from 'moment-timezone';

export type ClimateCheckHistoryEventMessage = {
    account: string
    date: string
    sector: string
    type: ClimateCheckHistoryItemType
};

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
        const date = moment.tz(account.timezone)
            .add(-1, 'day')
            .format('YYYY-MM-DD');
        const rSectors = OrgSectorsRepository.config(config, '', accountId);
        const sectors = await rSectors.all({includeRemoved: false});

        for (const sector of sectors) {
            const shallow: ClimateCheckHistoryEventMessage = {
                account: accountId,
                date,
                sector: sector.id,
                type: ClimateCheckHistoryItemType.shallow,
            };
            const deep = {...shallow, type: ClimateCheckHistoryItemType.deep};

            await events
                .publish('DailyClimateCheckHistory', 1, 'job', JSON.stringify(shallow), accountId);

            await events
                .publish('DailyClimateCheckHistory', 1, 'job', JSON.stringify(deep), accountId);
        }
    }
}

const events = EventsTopicService.config(config);
