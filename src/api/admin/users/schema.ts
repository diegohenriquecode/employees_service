import {AdminSchema} from 'modules/admins/schema';

export const CreateAdminSchema = AdminSchema
    .fork(['id', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden())
    .fork(['id', 'scopes'], schema => schema.optional());

export const UpdateAdminSchema = CreateAdminSchema
    .fork(['name'], schema => schema.optional())
    .fork(['email'], schema => schema.optional())
    .fork(['permissions'], schema => schema.optional())
    .fork(['disabled'], schema => schema.optional())
    .fork(['password'], schema => schema.optional());

export const SetDisabledSchema = AdminSchema.extract('disabled');
