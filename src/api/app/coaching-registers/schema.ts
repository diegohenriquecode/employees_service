import moment from 'moment';
import Joi from 'utils/joi';

import {QuerySchema} from '../users/schema';

export type CoachingRegistersListArgs = {
    sector?: string
    from: string
    to: string
    employee?: string
    manager?: string
    deep: boolean
    format: 'summary' | 'json' | 'xlsx'
    page: number
    pageSize: number
    order: 'ASC' | 'DESC'
    orderBy: string
};
export const CoachingRegistersListArgsSchema = QuerySchema.append<CoachingRegistersListArgs>({
    sector: Joi.string()
        .when('format', {not: 'summary', then: Joi.optional()}),
    from: Joi.string().isoDate().optional().default(moment(0).toISOString()),
    to: Joi.string().isoDate().optional().default(() => moment().toISOString()),
    employee: Joi.string().optional(),
    manager: Joi.string().optional(),
    deep: Joi.boolean().optional().default(false),
    format: Joi.string().valid('json', 'xlsx', 'summary').optional().default('summary'),
    orderBy: Joi.string().valid('created_at').optional().default('created_at'),
});
