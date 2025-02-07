import {SchemaMap} from 'joi';
import {ContentSchemaMap} from 'modules/contents/schema';
import Joi from 'utils/joi';

export const TrainingTopicSchemaMap: SchemaMap<TrainingTopic, true> = {
    id: Joi.string(),

    title: Joi.string().trim().min(1).max(255),
    content: ContentSchemaMap.id.allow(null),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
};

export type TrainingTopicProps = {
  title: string;
  content: string | null
};

export type TrainingTopic = WithDefaultProps<TrainingTopicProps>;
export type CreateTrainingTopicProps = TrainingTopicProps;
export type UpdateTrainingTopicProps = Partial<CreateTrainingTopicProps>;
