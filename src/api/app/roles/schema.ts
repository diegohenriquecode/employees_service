import Joi from 'joi';
import {RoleSchema} from 'modules/roles/schema';

export const CreateRoleSchema = RoleSchema
    .fork(['id', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const EnableRoleSchema = Joi.object({
    enabled: Joi.boolean().allow(null),
});

export const UpdateRoleSchema = RoleSchema
    .fork(['id', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());
