import Joi from 'joi';

export type ListChangesHistoryQuery = {
    accountId: string,
    from: Date,
    to: Date,
    entity: string,
    entity_id: string,
};

export const ListChangesHistoryQuerySchema = Joi.object<ListChangesHistoryQuery>().keys({
    accountId: Joi.string(),
    entity: Joi.string().optional(),
    entity_id: Joi.string().optional(),
    from: Joi.date().max('now').iso().optional().default(new Date(0)),
    to: Joi.date().min(Joi.ref('from')).iso().optional().default(() => new Date()),
});
