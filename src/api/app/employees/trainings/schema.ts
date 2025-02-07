import Joi from 'utils/joi';

export const RegisterProgressSchema = Joi.object({
    progress: Joi.number().integer().min(0).max(10000),
});
