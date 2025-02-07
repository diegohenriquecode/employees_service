import {SchemaMap} from 'joi';
import omit from 'lodash/omit';
import {TrainingTopic, TrainingTopicSchemaMap} from 'modules/training-topics/schema';
import Joi from 'utils/joi';

export const TrainingSchemaMap: SchemaMap<Training, true> = {
    id: Joi.string(),

    title: Joi.string().trim().min(1).max(255),
    thumbnail_key: Joi.string().allow(null),
    categories: Joi.array().items(Joi.string().trim()).unique(),
    description: Joi.string().trim().min(1).max(8192).allow(null),
    disabled: Joi.boolean(),
    topics: Joi.array().items(Joi.object(TrainingTopicSchemaMap)),
    allowedAccounts: Joi.array().items(Joi.string().trim()).unique().optional().default([]),

    account: Joi.string(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
};

export type TrainingProps = {
    title: string;
    categories: string[];
    thumbnail_key: string | null;
    description: string | null;
    disabled: boolean;
    topics: TrainingTopic[];
    allowedAccounts: string[];

    account: string;
};

export type Training = WithDefaultProps<TrainingProps>;
export type CreateTrainingProps = Omit<TrainingProps, 'account' | 'thumbnail_key' | 'topics' | 'disabled'>;
export type UpdateTrainingProps = Partial<CreateTrainingProps>;
export type ExternalTraining = Omit<Training, 'thumbnail_key'> & {thumbnail: string | null};

export type ExportTrainingType = Omit<ExternalTraining, 'topics' | 'allowedAccounts'> & {
    topics_count: number
};

export const out = (training: ExternalTraining): ExportTrainingType => {
    const ret = {
        ...training,
        readOnly: training.account === 'backoffice',
        topics_count: training.topics?.length || 0,
    };

    if (training.account === 'backoffice') {
        return omit(ret, 'topics');
    }

    return omit(ret, 'topics', 'allowedAccounts');
};
