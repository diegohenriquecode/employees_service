import {EvaluationType, EvaluationSchema} from 'modules/evaluations/schema';
import moment from 'moment';

import Joi from '../../utils/joi';

export const SCHEDULER_TYPE = {
    'decision_matrix': EvaluationType.decision_matrix,
    'ape': EvaluationType.ape,
} as const;

export const SCHEDULER_STATUS = {
    'active': 'active',
    'inactive': 'inactive',
    'executed': 'executed',
} as const;

export const FREQUENCY_TYPE = {
    'DAILY': 'DAILY',
    'WEEKLY': 'WEEKLY',
    'MONTHLY': 'MONTHLY',
} as const;

export const EvaluationsSchedulerSchema = Joi.object<EvaluationsScheduler>().keys({
    id: Joi.string(),

    type: Joi.string().valid(...Object.values(SCHEDULER_TYPE)),
    sector: EvaluationSchema.extract('sector'),
    account: EvaluationSchema.extract('account'),

    deadline_offset: Joi.number().integer().min(0).allow(null),
    status: Joi.string().valid(...Object.values(SCHEDULER_STATUS)),
    rule: Joi.object().keys({
        start: Joi.string().isoDate(),
        frequency: Joi.string().valid(...Object.values(FREQUENCY_TYPE)),
        interval: Joi.number().integer().positive().optional(),
        end: Joi.string().isoDate().optional(),
    }).custom((rule, helpers) => {
        const {start, end} = rule;

        if (!end) {
            return rule;
        }

        const now = moment();

        if (moment(end).isBefore(now)) {
            return helpers.message({
                custom: '"rule.end" cannot be in the past',
            });
        }

        if (moment(end).isBefore(start)) {
            return helpers.message({
                custom: '"rule.end" cannot be before "rule.start"',
            });
        }

        return rule;
    }),
    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type CreateEvaluationsSchedulerProps = Pick<EvaluationsSchedulerProps, 'type'| 'deadline_offset' | 'rule'>;
export type UpdateEvaluationsSchedulerProps = Pick<EvaluationsSchedulerProps, 'deadline_offset' | 'status' | 'rule'>;
export type EvaluationsSchedulerProps = {
  type: EvaluationType
  sector: string
  account: string

  deadline_offset: number | null
  status: keyof typeof SCHEDULER_STATUS
  rule: {
    start: string
    frequency: keyof typeof FREQUENCY_TYPE
    interval?: number
    end?: string
  }
};

export type EvaluationsScheduler = EvaluationsSchedulerProps & {
  id: string
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
};
