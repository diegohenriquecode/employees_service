import moment from 'moment/moment';
import Joi from 'utils/joi';

import {QuerySchema} from '../employees/schema';

export type DismissInterviewsListArgs = {
    sector: string
    from: string
    to: string
    employee?: string
    employees?: string[]
    deep: boolean
    manager?: string
    format: 'json' | 'xlsx' | 'summary'
    page: number
    pageSize: number
    order?: 'ASC' | 'DESC'
    orderBy?: string
};

export const DismissInterviewsListArgsSchema = QuerySchema.append<DismissInterviewsListArgs>({
    sector: Joi.string()
        .when('format', {
            is: Joi.exist().equal('xlsx', 'json'),
            then: Joi.string().optional(),
            otherwise: Joi.string().required(),
        }),
    from: Joi.string().isoDate().optional().default(moment(0).toISOString()),
    to: Joi.string().isoDate().optional().default(() => moment().toISOString()),
    employee: Joi.string().optional(),
    manager: Joi.string().optional(),
    deep: Joi.boolean().optional().default(false),
    format: Joi.string().valid('json', 'xlsx', 'summary').optional().default('summary'),
    orderBy: Joi.string().valid('dismissed_at').optional().default('dismissed_at'),
});

export type ClausesType = Record<string, Record<string, string | string[]>>;
