import {EvaluationSchema, EvaluationStatus, EvaluationType} from 'modules/evaluations/schema';
import moment from 'moment';
import Joi from 'utils/joi';

import {FinishEvaluationSchema, UpdateDecisionMatrixSchema} from '../employees/evaluations/schema';
import {QuerySchema} from '../employees/schema';

export type EvaluationListArgs = {
    daysLate?: number
    employee?: string
    responsible?: string
    from: Date
    onlyLast: boolean
    sector?: string
    deep: boolean
    status?: EvaluationStatus
    removed?: boolean
    to: Date
    type?: EvaluationType
    orderBy: string
    format: 'json' | 'xlsx' | 'summary'
};

export type EvaluationReportArgs = {
    from: string
    sector: string
    to: string
    type: string
};

export const EvaluationListArgsSchema = QuerySchema.append<EvaluationListArgs>({
    daysLate: Joi.number().integer().min(1).optional(),
    employee: Joi.string().optional(),
    responsible: Joi.string().optional(),
    from: Joi.date().iso().optional().default(() => new Date(0)),
    onlyLast: Joi.boolean().optional().default(false),
    orderBy: Joi.string().valid('created_at').optional().default('created_at'),
    sector: Joi.string().optional(),
    deep: Joi.boolean().optional().default(false),
    status: Joi.string().valid(...Object.values(EvaluationStatus)).optional(),
    to: Joi.date().iso().optional().default(() => new Date()),
    type: Joi.valid(...Object.values(EvaluationType)).optional(),
    format: Joi.string().valid('json', 'xlsx', 'summary').optional().default('json'),
});

export const EvaluationReportArgsSchema = QuerySchema.append<EvaluationReportArgs>({
    from: Joi.string().isoDate().optional().default(moment(0).toISOString()),
    sector: Joi.string(),
    to: Joi.string().isoDate().optional().default(() => moment().toISOString()),
    type: Joi.string().optional().default(EvaluationType.decision_matrix),
});

export const EvaluationTemplateQuerySchema = Joi.object({
    lang: Joi.string().valid('pt-BR'),
});

export const MultipleUpdateDecisionMatrixSchema = Joi.array().min(1).max(5).items(
    {
        id: EvaluationSchema.extract('id'),
        employee: EvaluationSchema.extract('employee'),
        emotional: UpdateDecisionMatrixSchema.extract('emotional'),
        technical: UpdateDecisionMatrixSchema.extract('technical'),
    },
);

export const MultipleFinishDecisionMatrixSchema = Joi.array().min(1).max(5).items(
    {
        id: EvaluationSchema.extract('id'),
        employee: EvaluationSchema.extract('employee'),
        status: FinishEvaluationSchema,
    },
);
