import {Context, SNSMessage, SQSEvent, SQSRecord} from 'aws-lambda';
import config from 'config';
import ClimateChecksRepository from 'modules/climate-checks/repository';
import {ErrorsNotification} from 'modules/errors/errors';
import QueueService from 'utils/queues';

import {User} from '../users/schema';
import UsersService from '../users/service';
import {ClimateCheckAssiduityEventMessage} from './job';
import ClimateCheckAssiduityRepository from './repository';

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
    const {account, date, sector: sectorId} = JSON.parse(Message) as ClimateCheckAssiduityEventMessage;

    const usersList = await UsersService.config(config, {} as User, 'lets-stop-passing-it')
        .subordinate_to(account, sectorId);

    const all = usersList.map(u => u.id);

    if (all.length > 0) {
        const climateChecks = await ClimateChecksRepository.config(config, account, '')
            .allOfDayBySectorId(date, sectorId);
        const completed = climateChecks.map(climate => climate._DateEmployee.split('#')[2]);

        const assiduity: {[employee: string]: boolean} = {};
        for (const key of all) {
            assiduity[key] = completed.includes(key);
        }

        await ClimateCheckAssiduityRepository.config(config, account)
            .create({sector: sectorId, date, assiduity});
    }
}

const queues = QueueService.config(config);
