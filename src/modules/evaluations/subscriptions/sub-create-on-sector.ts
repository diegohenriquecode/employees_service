import {Context, SNSMessage, SQSEvent} from 'aws-lambda';
import config from 'config';
import AccountsService from 'modules/accounts/service';
import {BadRequestError, ErrorsNotification, UnprocessableEntity} from 'modules/errors/errors';
import QueueService from 'utils/queues';

import {EvaluationCreateOnSectorEventMessage} from '../schema';
import EvaluationsService from '../service';

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

async function recordHandler(record: SQSEvent['Records'][0]) {
    const {Message} = JSON.parse(record.body) as SNSMessage;
    const {account: account_id, sector, user, tag, type, deadline} = JSON.parse(Message) as EvaluationCreateOnSectorEventMessage;

    try {
        const account = await accounts.retrieve(account_id);
        await EvaluationsService.config(config, user, account)
            .batchCreateOnSector(sector, {tag, type, deadline});
    } catch (error) {
        if (error instanceof UnprocessableEntity || error instanceof BadRequestError) {
            console.warn(error.message, Message);
        } else {
            throw error;
        }
    }
}

const accounts = AccountsService.config(config, '');
const queues = QueueService.config(config);
