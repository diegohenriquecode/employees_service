import {EvaluationsScheduler, EvaluationsSchedulerSchema} from 'modules/evaluations-scheduler/schema';

import Joi, {extract} from '../../../../utils/joi';

export const CreateEvaluationsScheduleSchema = extract(
    EvaluationsSchedulerSchema,
    ['type', 'deadline_offset', 'rule'],
);

export const UpdateEvaluationsScheduleSchema = extract(
    EvaluationsSchedulerSchema,
    ['deadline_offset', 'status', 'rule'],
    ['deadline_offset', 'status', 'rule'],
);

export const ListEvaluationsSchedulerQuerySchema = Joi.object<ListEvaluationsSchedulerQuery>().keys({
    type: EvaluationsSchedulerSchema.extract('type'),
});

export type ListEvaluationsSchedulerQuery = {
    type: EvaluationsScheduler['type']
};
