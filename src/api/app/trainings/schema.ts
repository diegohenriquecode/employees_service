import pick from 'lodash/pick';
import {TrainingProgressesServiceListProps} from 'modules/training-progresses/schema';
import {CreateTrainingProps, TrainingSchemaMap, UpdateTrainingProps} from 'modules/trainings/schema';
import {TrainingThumbnailUrlProps} from 'modules/trainings/service';
import moment from 'moment';
import Joi from 'utils/joi';

import {TrainingProgressSchemaMap} from '../../../modules/training-progresses/schema';

export const CreateTrainingSchema = Joi.object<CreateTrainingProps, true>(
    pick(TrainingSchemaMap, 'title', 'categories', 'description', 'allowedAccounts'),
);

export const UpdateTrainingSchema = Joi.object<UpdateTrainingProps, true>(
    pick(TrainingSchemaMap, 'title', 'categories', 'description', 'allowedAccounts'),
).options({presence: 'optional'});

export const SetDisabledSchema = TrainingSchemaMap.disabled;

export const GetUploadMapUrlSchema = Joi.object<TrainingThumbnailUrlProps, true>({
    ContentType: Joi.string().pattern(/^image\/.+/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});

export type TrainingProgressesQuery = TrainingProgressesServiceListProps & {
    format: 'json' | 'xlsx';
    title?: string;
    sector?: string;
    deep: boolean;
};

export const TrainingProgressesServiceListArgsSchema = Joi.object<TrainingProgressesQuery, true>({
    page: Joi.number().integer().min(0).optional().default(0),
    pageSize: Joi.number().integer().min(1).max(500).optional().default(10),
    order: Joi.string().valid('ASC', 'DESC').optional().default('ASC'),
    orderBy: Joi.string().valid('created_at', 'created_by', 'updated_at', 'updated_by', 'training', 'employee').optional(),
    training: Joi.array().items(TrainingProgressSchemaMap.training).optional().single(),
    format: Joi.string().valid('json', 'xlsx').optional().default('json'),
    title: Joi.string().optional(),
    deep: Joi.boolean().optional().default(false),
    employee: Joi.array().items(Joi.string()).optional().single(),
    sector: Joi.string().optional(),
    from: Joi.string().isoDate().optional().default(moment(0).toISOString()),
    to: Joi.string().isoDate().optional().default(() => moment().toISOString()),
});

export type QueryArgs = {
    order: 'ASC' | 'DESC',
    orderBy: string,
};

export const QuerySchema = Joi.object<QueryArgs>().keys({
    order: Joi.string().uppercase().valid('ASC', 'DESC').optional().default('DESC'),
    orderBy: Joi.string().valid('created_at').optional().default('created_at'),
}).unknown(true);
