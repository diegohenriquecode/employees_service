
import {HttpStatusCode} from 'axios';

import Joi from '../../utils/joi';

export type AdminProps = {
    name: string
    email: string
    password: string
    scopes: string
    disabled: boolean
    permissions: object
};

export type Admin = AdminProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export enum PermissionTypes {
    manage = 'manage',
    list = 'list',
    detail = 'detail',
    create = 'create',
    delete = 'delete',
    edit = 'edit',
}

export enum permissionResources {
    commercialAccounts = 'commercialAccounts',
    trainingAccounts = 'trainingAccounts',
    faq = 'faq',
    notes = 'notes',
    tutorials = 'tutorials',
    trainings = 'trainings',
    admins = 'admins',
    configuration = 'configuration',
    boletos = 'boletos'
}

const PermissionSchema = Joi.string().optional().custom((value, helper) => {
    const items = value.split(',').map((i: string) => i.trim());
    const valid = Object.keys(PermissionTypes);

    if (items.some((i: string) => !valid.includes(i))) {
        return helper.error(`${HttpStatusCode.BadRequest}`);
    }

    return value;
}).message(`The value must be one of ${Object.keys(PermissionTypes)}`);

export const AdminSchema = Joi.object().keys({
    id: Joi.string(),

    name: Joi.string().trim(),
    email: Joi.string().email().lowercase().trim(),
    password: Joi.string().trim().min(8),
    permissions: Joi.object().keys({
        commercialAccounts: PermissionSchema,
        trainingAccounts: PermissionSchema,
        faq: PermissionSchema,
        notes: PermissionSchema,
        tutorials: PermissionSchema,
        trainings: PermissionSchema,
        admins: PermissionSchema,

    }),
    scopes: Joi.string(),
    disabled: Joi.boolean(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});
