import moment from 'moment';
import Joi from 'utils/joi';

import {QuerySchema} from '../employees/schema';

export type SuspensionListArgs = {
    from: string
    sector: string
    to: string
    employee?: string
    manager?: string
    format: 'json' | 'xlsx' | 'summary'
    page: number
    pageSize: number
    deep: boolean
    order?: 'ASC' | 'DESC'
    orderBy?: string
};

export const SuspensionListArgsSchema = QuerySchema.append<SuspensionListArgs>({
    from: Joi.string().isoDate().optional().default(moment(0).toISOString()),
    sector: Joi.string().optional(),
    to: Joi.string().isoDate().optional().default(() => moment().toISOString()),
    employee: Joi.string().optional(),
    manager: Joi.string().optional(),
    deep: Joi.boolean().optional().default(false),
    format: Joi.string().valid('json', 'xlsx', 'summary').optional().default('summary'),
    orderBy: Joi.string().valid('created_at').optional().default('created_at'),
});
