import Joi from '../../utils/joi';
import Policies from './policies';
import {permissionConverter} from './rolesConverter';

export type Role = {
    id: string,
    account: string,

    permissions: PermissionType[],
    name: string

    created_by: string
    created_at: string
    updated_by: string
    updated_at: string
    private?: boolean
    enabled?: boolean
};

export const RoleSchema = Joi.object<Role>().keys({
    id: Joi.string(),
    account: Joi.string(),
    permissions: Joi.array().items(Joi.string().valid(...Object.keys(Policies))),
    name: Joi.string().trim().min(2).max(200),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export const initialRoles = ['employee', 'rh', 'manager', 'admin'];

export type PermissionType = keyof typeof permissionConverter;
