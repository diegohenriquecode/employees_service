import Joi from 'utils/joi';

export type EmployeeUpdateHistoryQuery = {
    from: Date
    next?: string
    pageSize: number
    to: Date
};

export const EmployeeUpdateHistoryQuerySchema = Joi.object<EmployeeUpdateHistoryQuery>().keys({
    from: Joi.date().max('now').iso().optional().default(() => new Date(0)),
    next: Joi.string().optional(),
    pageSize: Joi.number().integer().min(1).max(100).optional().default(10),
    to: Joi.date().min(Joi.ref('from')).iso().optional().default(() => new Date()),
});
