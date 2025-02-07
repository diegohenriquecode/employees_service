import pick from 'lodash/pick';
import {CreateTrainingTopicProps, TrainingTopicSchemaMap, UpdateTrainingTopicProps} from 'modules/training-topics/schema';
import Joi from 'utils/joi';

export const CreateTrainingTopicSchema = Joi.object<Omit<CreateTrainingTopicProps, 'content'>, true>(
    pick(TrainingTopicSchemaMap, 'title'),
);

export const UpdateTrainingTopicSchema = Joi.object<Pick<UpdateTrainingTopicProps, 'title'>, true>(
    pick(TrainingTopicSchemaMap, 'title'),
).options({presence: 'optional'});
