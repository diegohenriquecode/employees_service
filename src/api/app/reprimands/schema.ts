import moment from 'moment';
import Joi from 'utils/joi';

import {QuerySchema} from '../employees/schema';

export type ReprimandListArgs = {
    created_by?: string
    employee?: string
    from: string
    page: number
    pageSize: number
    manager?: string
    deep?: boolean,
    sector: string
    to: string
    format?: 'summary' | 'json' | 'xlsx',
    order?: 'ASC' | 'DESC'
    orderBy?: string
};

export const ReprimandListArgsSchema = QuerySchema.append<ReprimandListArgs>({
    created_by: Joi.string().optional(),
    manager: Joi.string().optional(),
    employee: Joi.string().optional(),
    from: Joi.string().isoDate().optional().default(moment(0).toISOString()),
    sector: Joi.string().optional(),
    to: Joi.string().isoDate().optional().default(() => moment().toISOString()),
    format: Joi.string().valid('json', 'xlsx', 'summary').optional().default('summary'),
    orderBy: Joi.string().valid('created_at').optional().default('created_at'),
    order: Joi.string().valid('ASC', 'DESC').optional().default('DESC'),
    page: Joi.number().min(0).optional().default(0),
    deep: Joi.boolean().optional().default(false),
    pageSize: Joi.number().min(1).max(100).optional().default(10),
});
