import {SchemaMap} from 'joi';
import Joi from 'utils/joi';

export enum TrainingTrailCategory {
    'EDUCATION_AND_CULTURE' = 'EDUCATION_AND_CULTURE',
    'OPERATIONAL_TRAINING' = 'OPERATIONAL_TRAINING',
    'ADVANCED_TRAINING' = 'ADVANCED_TRAINING',
}

export const TrainingTrailSchemaMap: SchemaMap<TrainingTrail, true> = {
    id: Joi.string(),

    title: Joi.string().trim().min(1).max(255),
    description: Joi.string().trim().min(1).max(1024),
    thumbnail_key: Joi.string().allow(null),
    ranks: Joi.array().items(Joi.string()).optional().default([])
        .when('employee', {is: Joi.array().min(1).required(), then: Joi.array().length(0)}),
    sectors: Joi.array().items(Joi.string()).optional().default([])
        .when('employee', {is: Joi.array().min(1).required(), then: Joi.array().length(0)}),
    roles: Joi.array().items(Joi.string()).optional().default([])
        .when('employee', {is: Joi.array().min(1).required(), then: Joi.array().length(0)}),

    deadline: Joi.number().integer().min(1),
    disabled: Joi.boolean(),

    category: Joi.string().allow('').valid(...Object.keys(TrainingTrailCategory)).optional(),
    trainings: Joi.array().items(Joi.string()).optional().default([]),
    employee: Joi.array().items(Joi.string()).optional(),

    account: Joi.string(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
};

export type TrainingTrailProps = {
  title: string
  description: string
  thumbnail_key: string | null
  ranks: string[]
  sectors: string[]
  roles: string[]
  deadline: number
  disabled: boolean
  category?: TrainingTrailCategory

  trainings: string[]
  employee?: string[];

  account: string;
};

export type TrainingTrail = WithDefaultProps<TrainingTrailProps>;
export type CreateTrainingTrailProps = Omit<TrainingTrailProps, 'account' | 'trainings' | 'thumbnail_key' | 'disabled'>;
export type UpdateTrainingTrailProps = Omit<TrainingTrailProps, 'account' | 'thumbnail_key' | 'disabled'>;
export type ExternalTrainingTrail = Omit<TrainingTrail, 'thumbnail_key'> & { thumbnail: string | null };
