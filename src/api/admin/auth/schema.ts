import {AdminSchema} from '../../../modules/admins/schema';
import Joi from '../../../utils/joi';

export const IssueTokenSchema = Joi.object().keys({
    grant_type: Joi.string().valid('password'),
    username: Joi.string().trim().lowercase(),
    password: Joi.string().trim(),
    scope: AdminSchema.extract('scopes').optional(),
    client_id: Joi.string().trim(),
});

export const ChangePasswordSchema = Joi.object().keys({
    username: Joi.string().trim().lowercase(),
    client_id: Joi.string().trim(),
});

export const ResendCodeSchema = Joi.object().keys({
    session: Joi.string().trim(),
});

export const ValidateCodeSchema = Joi.object().keys({
    session: Joi.string().trim(),
    code: Joi.string().trim(),
});

export const SetPasswordSchema = Joi.object().keys({
    session: Joi.string().trim(),
    password: AdminSchema.extract('password'),
});
