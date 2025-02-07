import Joi from 'joi';
import {TemplateTypes} from 'modules/templates/schema';

export const CreateTemplateSchema = Joi.object().keys({
    type: Joi.valid(...(Object.values(TemplateTypes))),
    properties: Joi.object().unknown(true),
});

export const UpdateTemplateSchema = CreateTemplateSchema;

export const ListTemplateQuerySchema = Joi.object().keys({
    type: Joi.valid(...Object.values(TemplateTypes)),
});
