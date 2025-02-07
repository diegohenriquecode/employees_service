import {SchemaMap} from 'joi';
import Joi from 'utils/joi';

export const TrainingProgressSchemaMap: SchemaMap<TrainingProgress, true> = {
    training: Joi.string(),

    topics: Joi.object().pattern(Joi.string(), Joi.object({
        progress: Joi.number().integer().min(0).max(10000),
    })),

    progress: Joi.number().integer().min(0).max(10000),

    employee: Joi.string(),
    account: Joi.string(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
};

export type TrainingProgressProps = {
    topics: Record<string, {progress: number}>
    progress: number

    employee: string
    account: string;
};

export type TrainingProgress = Omit<WithDefaultProps<TrainingProgressProps>, 'id'> & {training: string};

export type TrainingProgressesServiceListProps = {
    order?: 'ASC' | 'DESC';
    orderBy?: keyof TrainingProgress;
    page?: number;
    pageSize?: number;
    training?: string[];
    employee?: string[];
    from: string;
    to: string;
};

export const TrainingsReportHeaders = [
    'id',
    'thumb',
    'description',
    'disabled',
    'categories',
    'title',
    'account',
    'thumbnail',
    'topics_count',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by',
];
