import {SectorSchema} from '../../../modules/orgchart/schema';
import {PureUserSchema} from '../../../modules/users/schema';
import Joi from '../../../utils/joi';

export const CreateUserSchema = PureUserSchema
    .fork(['id', 'scopes', 'change_password', 'disabled', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const UpdateUserSchema = CreateUserSchema
    .fork(['username'], schema => schema.forbidden())
    .fork(['password'], schema => schema.optional());

export const SetDisabledSchema = Joi.bool();

export const QuerySchema = Joi.object().keys({
    page: Joi.number().integer().min(0).optional().default(0),
    pageSize: Joi.number().integer().min(1).max(100).optional().default(10),
    order: Joi.string().uppercase().valid('ASC', 'DESC').optional().default('DESC'),
}).unknown(true);

export const QueryUsersSchema = QuerySchema.append({
    orderBy: Joi.string().valid('name', 'updated_at').optional().default('name'),
    search: Joi.string().trim().optional(),
    searchIn: Joi.array().items(Joi.string()).optional().default(['id', 'name', 'username', 'email']),
    sector: SectorSchema.extract('id').optional(),
});

export const UpdatePasswordSchema = Joi.object({
    old_password: PureUserSchema.extract('password'),
    new_password: PureUserSchema.extract('password'),
});
