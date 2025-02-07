import {AdminSchema} from '../../../modules/admins/schema';

export const CreateAdminSchema = AdminSchema
    .fork(['password', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden())
    .fork(['id', 'scopes'], schema => schema.optional());
