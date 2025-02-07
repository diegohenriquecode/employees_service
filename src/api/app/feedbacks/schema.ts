import {FeedbackType} from 'modules/feedbacks/schema';
import Joi from 'utils/joi';

import {QuerySchema} from '../employees/schema';

export type FeedbackListArgs = {
    created_by?: string
    employee?: string
    from: Date
    page: number
    pageSize: number
    sector?: string
    to: Date
    type?: string
    deep: boolean,
    format: 'summary' | 'json' | 'xlsx',
    order: 'ASC' | 'DESC'
    orderBy: string

};

export const FeedbackListArgsSchema = QuerySchema.append<FeedbackListArgs>({
    created_by: Joi.string().optional(),
    employee: Joi.string().optional(),
    from: Joi.date().iso().optional().default(() => new Date(0)),
    sector: Joi.string().optional(),
    deep: Joi.boolean().optional().default(false),
    to: Joi.date().iso().optional().default(() => new Date()),
    type: Joi.any().when('format', {is: 'summary', then: Joi.forbidden(), otherwise: Joi.valid(...Object.values(FeedbackType)).optional()}),
    format: Joi.string().valid('json', 'xlsx', 'summary').optional().default('json'),
    orderBy: Joi.string().valid('created_at').optional().default('created_at'),
});
