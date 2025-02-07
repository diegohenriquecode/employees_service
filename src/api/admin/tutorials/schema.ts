import Joi from '../../../utils/joi';

export const CreateTutorialSchema = Joi.object({
    title: Joi.string().trim().min(3).max(255),
    thumbnail: Joi.string().uri(),
    tags: Joi.array().items(Joi.string().trim()).unique(),
    disabled: Joi.boolean(),
    roles: Joi.array().min(1).items(Joi.string().valid('admin', 'rh', 'manager', 'employee')),
});

export const UpdateTutorialSchema = CreateTutorialSchema
    .fork(['title', 'thumbnail', 'tags', 'roles'], schema => schema.optional())
    .fork(['disabled'], schema => schema.forbidden());

export const GetThumbnailUrlSchema = Joi.object({
    ContentType: Joi.string().pattern(/^image\/.+/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});

export const SetDisabledSchema = Joi.boolean();
