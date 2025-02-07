import {ListTimelineProps} from 'modules/timelines/schema';
import Joi from 'utils/joi';

export type QueryTimelines = ListTimelineProps & {
    from: Date
    to: Date
};

export const QueryTimelinesSchema = Joi.object<QueryTimelines>().keys({
    pageSize: Joi.number().integer().min(1).max(100).optional().default(10),
    from: Joi.date().max('now').iso().optional().default(new Date(0)),
    next: Joi.string().optional(),
    to: Joi.date().min(Joi.ref('from')).iso().optional().default(() => new Date()),
    type: Joi.string().optional(),
}).unknown(true);
