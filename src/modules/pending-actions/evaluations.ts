import {Context, SQSEvent} from 'aws-lambda';
import {Evaluation, EvaluationStatus, EvaluationType, MultidirectionalRegexp} from 'modules/evaluations/schema';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import {PendingActionsTypes} from './schema';
import PendingActionsService from './service';

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

        if (payload.EventType === 'INSERT') {
            const {NewItem: evaluation} = payload;
            const users = UsersService.config(config, {id: 'evaluations-pending-actions'} as User, evaluation.account);

            const done = payload.NewItem?.status === EvaluationStatus.done;

            if (evaluation.type === EvaluationType.ape || evaluation.type === EvaluationType.decision_matrix) {
                const employee = await users.retrieve(evaluation.employee);
                const employeeSubordinateTo = employee.sectors[evaluation.sector].subordinate_to;
                await create(PendingActionsTypes.EvaluationNotDone, evaluation.responsible, employeeSubordinateTo, evaluation, done);
            }

            if (MultidirectionalRegexp.test(evaluation.type)) {
                for (const component of evaluation.evaluations) {
                    await create(PendingActionsTypes.EvaluationNotDone, component.responsible, component.sector, evaluation, done);
                }
            }

        } else if (payload.EventType === 'MODIFY') {
            const {NewItem: evaluation} = payload;

            if (!payload.OldItem?.removed || payload.OldItem?.removed === null && payload.newItem.removed) {
                await PendingActionsService.config(config, 'evaluations-change-handler', evaluation.account)
                    .deleteBySource(evaluation.account, evaluation.id);
            }

            const fullyDone = payload.OldItem?.status !== EvaluationStatus.done && payload.NewItem?.status === EvaluationStatus.done;
            const disclosedToEmployee = !payload.OldItem?.disclosed_to_employee && payload.NewItem?.disclosed_to_employee;
            const fullyExpired = payload.OldItem?.status !== EvaluationStatus.expired && payload.NewItem?.status === EvaluationStatus.expired;

            if (evaluation.type === EvaluationType.ape) {
                if (fullyDone) {
                    await create(PendingActionsTypes.EvaluationNotRead, evaluation.employee, evaluation.sector, evaluation);
                    await setDone(PendingActionsTypes.EvaluationNotDone, evaluation.responsible, evaluation);
                }
                if (!payload.OldItem.read && payload.NewItem.read) {
                    await setDone(PendingActionsTypes.EvaluationNotRead, evaluation.employee, evaluation);
                }

            }

            if (evaluation.type === EvaluationType.decision_matrix) {
                if (fullyDone) {
                    await setDone(PendingActionsTypes.EvaluationNotDone, evaluation.responsible, evaluation);
                }
                if (disclosedToEmployee) {
                    await create(PendingActionsTypes.EvaluationNotRead, evaluation.employee, evaluation.sector, evaluation);
                }
                if (!payload.OldItem.read && payload.NewItem.read) {
                    await setDone(PendingActionsTypes.EvaluationNotRead, evaluation.employee, evaluation);
                }
            }

            if (MultidirectionalRegexp.test(evaluation.type)) {
                for (let i = 0; i < evaluation.evaluations.length; i++) {
                    const oldItem = payload.OldItem.evaluations[i];
                    const newItem = payload.NewItem.evaluations[i];
                    if (fullyDone || fullyExpired || oldItem?.status !== EvaluationStatus.done && newItem?.status === EvaluationStatus.done) {
                        await setDone(PendingActionsTypes.EvaluationNotDone, newItem.responsible, evaluation);
                    }
                }
            }

        } else { // payload.EventType === 'REMOVE'
            const {OldItem: evaluation} = payload;
            await PendingActionsService.config(config, 'evaluations-change-handler', evaluation.account)
                .deleteBySource(evaluation.account, evaluation.id);
        }

        await queues.deleteMessage(record);
    }
}

const queues = QueueService.config(config);

function create(type: string, target: string, targetSector: string, evaluation: Evaluation, done = false) {
    return PendingActionsService.config(config, 'evaluations-change-handler', evaluation.account).create(
        evaluation.account,
        target,
        targetSector,
        type,
        evaluation.id,
        evaluation.created_at,
        {type: evaluation.type, employee: evaluation.employee, sector: evaluation.sector, created_by: evaluation.created_by},
        done,
    );
}

function setDone(type: string, target: string, evaluation: Evaluation) {
    return PendingActionsService.config(config, 'evaluations-change-handler', evaluation.account)
        .setDone(evaluation.account, target, type, evaluation.id);
}
