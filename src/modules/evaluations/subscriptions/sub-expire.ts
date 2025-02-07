import {Context, SNSMessage, SQSEvent, SQSRecord} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';
import QueueService from 'utils/queues';

import {MultidirectionalEvaluationByType} from '../bases';
import {EvaluationExpirationEventMessage} from '../job';
import EvaluationsRepository from '../repository';
import EvaluationsMysqlRepository from '../repository.mysql';
import {Evaluation, EvaluationMultidirectional, EvaluationStatus} from '../schema';
import {evaluationResult} from '../service-multidirectional';

export async function handler(event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event);
    } catch (e) {
        console.error(e);
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
    const {account, date, type} = JSON.parse(Message) as EvaluationExpirationEventMessage;

    const list = await mysqlRepo.list({
        '$and': [
            {'account': {'$eq': account}},
            {'type': {'$eq': type}},
            {'deadline': {'$lte': date}},
            {'status': {'$eq': EvaluationStatus.created}},
            {'removed': {'$ne': true}},
        ],
    });

    const repo = EvaluationsRepository
        .config(config, 'sub-expire', account);

    for (const item of list.items) {
        const {employee, id} = item;
        const evaluation = await repo.retrieve(employee, id) as EvaluationMultidirectional & Evaluation;

        const doneEvaluations = evaluation.evaluations.filter(e => e.status === EvaluationStatus.done);

        let update = {};
        if (doneEvaluations.length >= 3 && doneEvaluations.find(e => e.responsible === employee)) {
            update = evaluationResult(evaluation, MultidirectionalEvaluationByType[evaluation.type]);
        } else {
            update = {status: EvaluationStatus.expired};
        }

        await repo.update(evaluation, update);
    }

}

const mysqlRepo = EvaluationsMysqlRepository.config(config);
const queues = QueueService.config(config);
