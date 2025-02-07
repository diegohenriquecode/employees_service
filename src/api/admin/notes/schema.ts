import Joi from '../../../utils/joi';

export const QuerySchema = Joi.object<Query>({
    page: Joi.number().integer().min(0).optional().default(0),
    pageSize: Joi.number().integer().min(1).max(100).optional().default(10),
}).unknown(true);

export type Query = {
    page: number
    pageSize: number
    order: string
    orderBy: string
};
