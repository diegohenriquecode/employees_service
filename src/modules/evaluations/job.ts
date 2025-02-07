import {Context, ScheduledEvent} from 'aws-lambda';
import config from 'config';
import AccountsRepository from 'modules/accounts/repository';
import {ErrorsNotification} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import moment from 'moment';

import {MultidirectionalEvaluation, MultidirectionalEvaluations} from './bases';

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
    const accounts = (await AccountsRepository.config(config, '').list())
        .filter(account => !account.disabled)
        .map(account => account.id);

    for (const account of accounts) {
        for (const type of MULTIDIRECTIONAL_TYPES) {
            const data: EvaluationExpirationEventMessage = {
                account,
                type,
                date: moment().toISOString(),
            };
            await events.publish(
                'ExpireEvaluation',
                1,
                'job',
                JSON.stringify(data),
                account,
            );
        }
    }
}

const events = EventsTopicService.config(config);

const MULTIDIRECTIONAL_TYPES = MultidirectionalEvaluations.map(e => e.type);

export type EvaluationExpirationEventMessage = {
  account: string
  type: MultidirectionalEvaluation['type']
  date: string
};
