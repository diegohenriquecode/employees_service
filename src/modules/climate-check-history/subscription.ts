import {Context, SNSMessage, SQSEvent, SQSRecord} from 'aws-lambda';
import config from 'config';
import {ClimateCheckHistoryEventMessage} from 'modules/climate-check-history/job';
import ClimateCheckHistoryRepository from 'modules/climate-check-history/repository';
import ClimateChecksRepository from 'modules/climate-checks/repository';
import {computeDailyCheck} from 'modules/climate-checks/service';
import {ErrorsNotification} from 'modules/errors/errors';
import QueueService from 'utils/queues';

import {ClimateCheckHistoryItemType} from './schema';

export async function handler(event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event);
    } catch (e) {
        await ErrorsNotification.publish(context);
    }
}

async function _handler(event: SQSEvent) {
    for (const record of event.Records) {
        await recordHandler(record);
        await queues.deleteMessage(record);
    }
}

async function recordHandler(record: SQSRecord) {
    const {Message} = JSON.parse(record.body) as SNSMessage;
    const {account, date, sector, type} = JSON.parse(Message) as ClimateCheckHistoryEventMessage;

    const repository = ClimateChecksRepository.config(config, account, '');

    let climateChecks;
    if (type === ClimateCheckHistoryItemType.shallow) {
        climateChecks = await repository
            .allOfDayBySectorId(date, sector);
    } else {
        climateChecks = await repository
            .allOfDayBySectorPath(date, sector);
    }

    const computedClimateCheck = computeDailyCheck(climateChecks);

    await ClimateCheckHistoryRepository.config(config, account)
        .create(sector, type, date, computedClimateCheck);
}

const queues = QueueService.config(config);
