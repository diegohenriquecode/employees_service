import {PureUserSchema} from 'modules/users/schema';
import Joi from 'utils/joi';

export const UpdatePasswordSchema = Joi.object({
    username: PureUserSchema.extract('username'),
    old_password: PureUserSchema.extract('password'),
    new_password: PureUserSchema.extract('password'),
});
