import {Context, SQSEvent, SQSRecord} from 'aws-lambda';
import {EvaluationType} from 'modules/evaluations/schema';

import config from '../../../config';
import {DDBStreamEvent} from '../../../utils/dynamo-client';
import sqsEventHandler, {changedTo} from '../../../utils/sqs-event-handler';
import {User} from '../../users/schema';
import EvaluationsSchedulerRepository from '../repository';
import {EvaluationsScheduler, SCHEDULER_STATUS} from '../schema';

export const handler = (event: SQSEvent, context: Context) => sqsEventHandler(event, context, _handler);

async function _handler(record: SQSRecord) {
    const payload = JSON.parse(JSON.parse(record.body).Message) as DDBStreamEvent<User>;

    if ((payload.EventType === 'MODIFY' && changedTo(payload, 'disabled', true)) || payload.EventType === 'REMOVE') {
        const {OldItem: user} = payload;
        if (user) {
            const repository = EvaluationsSchedulerRepository.config(config, user.id, user.account);
            const evaluations: EvaluationsScheduler[] = await repository.listBySector(user.id, EvaluationType.ape);
            for (const pendingEvaluation of evaluations) {
                await repository.update(pendingEvaluation, {status: SCHEDULER_STATUS.inactive});
            }
        }
    }
}
