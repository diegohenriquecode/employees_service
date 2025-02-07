import Joi from '../../../../utils/joi';

export const QueryClimateChecksArgsSchema = Joi.object<QueryClimateChecksArgs>().keys({
    deep: Joi.boolean().optional().default(false),
    date: Joi.date().iso().optional(),
});

export const QueryClimateCheckHistoryArgsSchema = Joi.object<QueryClimateCheckHistoryArgs>().keys({
    from: Joi.date().format('YYYY-MM-DD').required(),
    to: Joi.date().min(Joi.ref('from')).format('YYYY-MM-DD').optional(),
    deep: QueryClimateChecksArgsSchema.extract('deep'),
});

export const QueryClimateCheckAssiduityArgsSchema = Joi.object<QueryClimateCheckAssiduityArgs>().keys({
    from: Joi.date().format('YYYY-MM-DD').required(),
    to: Joi.date().min(Joi.ref('from')).format('YYYY-MM-DD').optional(),
});

export type QueryClimateChecksArgs = {
  deep: boolean,
  date: Date,
};

export type QueryClimateCheckHistoryArgs = {
  from: Date
  to?: Date
  deep: boolean
};

export type QueryClimateCheckAssiduityArgs = {
  from: Date
  to: Date
};
