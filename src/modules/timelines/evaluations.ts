import {Context, SQSEvent} from 'aws-lambda';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import {Evaluation, EvaluationStatus, EvaluationType, MultidirectionalRegexp} from '../evaluations/schema';
import TimelinesService from './service';

export const handler = async function (event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event);
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

async function _handler(event: SQSEvent) {
    for (const record of event.Records) {
        const {
            body: MessageBody,
        } = record;

        const payload = JSON.parse(JSON.parse(MessageBody).Message);

        if (payload.EventType === 'MODIFY') {
            const disclosedToEmployee = !payload.OldItem?.disclosed_to_employee && payload.NewItem?.disclosed_to_employee;
            if (payload.OldItem?.status !== EvaluationStatus.done && payload.NewItem?.status === EvaluationStatus.done) {
                const evaluation = payload.NewItem as Evaluation;
                await actions.create(
                    evaluation.account,
                    evaluation.employee,
                    timelineType(evaluation.type),
                    evaluation.id,
                    evaluation.updated_at,
                    {type: evaluation.type, responsible: evaluation.responsible, sector: evaluation.sector, created_by: evaluation.created_by},
                );
            }
            if (disclosedToEmployee) {
                const evaluation = payload.NewItem as Evaluation;
                await actions.create(
                    evaluation.account,
                    evaluation.employee,
                    'Evaluation.DecisionMatrixDisclosedToEmployee',
                    evaluation.id,
                    evaluation.updated_at,
                    {type: evaluation.type, responsible: evaluation.responsible, sector: evaluation.sector, created_by: evaluation.created_by},
                );
            }
        }
        if (payload.EventType === 'REMOVE') {
            const evaluation = payload.OldItem as Evaluation;
            await actions.removeBySource(evaluation.account, evaluation.id);
        }

        await queues.deleteMessage(record);
    }
}

function timelineType(evaluationType: EvaluationType) {
    const result = {
        [EvaluationType.decision_matrix]: 'Evaluation.DecisionMatrix',
        [EvaluationType.ape]: 'Evaluation.APE',
    }[evaluationType];

    if (!result && MultidirectionalRegexp.test(evaluationType)) {
        return 'Evaluation.Multidirectional';
    }

    return result;
}

const actions = TimelinesService.config(config, 'timeline-evaluations-handler');
const queues = QueueService.config(config);
