import Joi from 'joi';
import {FaqSchema} from 'modules/faq/schema';

export const SetDisabledSchema = Joi.boolean();

export const UpdateFaqSchema = FaqSchema.fork(['question', 'answer', 'tags'], (schema) => schema.optional());
