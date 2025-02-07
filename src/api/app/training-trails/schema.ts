import pick from 'lodash/pick';
import {CreateTrainingTrailProps, TrainingTrailCategory, TrainingTrailSchemaMap, UpdateTrainingTrailProps} from 'modules/training-trails/schema';
import {TrainingTrailThumbnailUrlProps} from 'modules/training-trails/service';
import moment from 'moment';
import Joi from 'utils/joi';

import {QuerySchema} from '../employees/schema';

export const CreateTrainingTrailSchema = Joi.object<CreateTrainingTrailProps, true>({
    ...pick(TrainingTrailSchemaMap, 'title', 'description', 'ranks', 'deadline', 'sectors', 'roles', 'category'),
    employee: Joi.array().items(Joi.string()).optional(),

});

export const UpdateTrainingTrailSchema = Joi.object<UpdateTrainingTrailProps, true>(
    pick(TrainingTrailSchemaMap, 'title', 'description', 'ranks', 'deadline', 'trainings', 'sectors', 'roles', 'category', 'employee'),
).options({presence: 'optional'});

export const SetDisabledSchema = TrainingTrailSchemaMap.disabled;

export const GetUploadMapUrlSchema = Joi.object<TrainingTrailThumbnailUrlProps, true>({
    ContentType: Joi.string().pattern(/^image\/.+/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});

export type TrainingTrailsArgs = {
    summary: boolean
    detailed: boolean
    sector: string
    category: TrainingTrailCategory
    from: string
    to: string
    order: 'ASC' | 'DESC',
    orderBy: string,
};
export const TrainingTrailsArgsSchema = QuerySchema.append<TrainingTrailsArgs>({
    summary: Joi.boolean().optional(),
    detailed: Joi.boolean().optional(),
    sector: Joi.string().optional()
        .when('summary', {is: Joi.exist().equal(true), then: Joi.string().required()}),
    category: Joi.string().optional()
        .when('detailed', {is: Joi.exist().equal(true), then: Joi.string().allow('').valid(...Object.keys(TrainingTrailCategory)).optional()}),
    from: Joi.optional()
        .when('summary', {
            is: Joi.exist().equal(true),
            then: Joi.string().isoDate().optional().default(moment(0).toISOString()),
        }),
    to: Joi.optional()
        .when('summary', {
            is: Joi.exist().equal(true),
            then: Joi.string().isoDate().optional().default(() => moment().toISOString()),
        }),
    order: Joi.string().uppercase().valid('ASC', 'DESC').optional().default('DESC'),
    orderBy: Joi.string().valid('created_at').optional().default('created_at'),
});
