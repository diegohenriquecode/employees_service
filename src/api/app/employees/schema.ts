import {EmployeeSchema} from 'modules/employees/schema';
import {User, UserSchema} from 'modules/users/schema';

import {SectorSchema} from '../../../modules/orgchart/schema';
import Joi from '../../../utils/joi';

type QueryArgs = {
    page: number,
    pageSize: number,
    order: 'ASC' | 'DESC',
};

export type QueryEmployeesArgs = QueryArgs & {
    includeDisabled: boolean,
    includeSelf: boolean,
    orderBy: string,
    search?: string,
    searchIn: [string],
    sector?: string,
    deep: boolean,
    subordinate_to?: string,
};

export const QuerySchema = Joi.object<QueryArgs>().keys({
    page: Joi.number().integer().min(0).optional().default(0),
    pageSize: Joi.number().integer().min(1).max(100).optional().default(10),
    order: Joi.string().uppercase().valid('ASC', 'DESC').optional().default('DESC'),
}).unknown(true);

export const QueryEmployeesSchema = QuerySchema.append<QueryEmployeesArgs>({
    includeDisabled: Joi.boolean().optional().default(false),
    includeSelf: Joi.boolean().optional().default(false),
    orderBy: Joi.string().valid('name', 'updated_at').optional().default('name'),
    search: Joi.string().trim().optional(),
    searchIn: Joi.array().items(Joi.string().invalid('username')).optional().default(['id', 'name', 'email']),
    sector: SectorSchema.extract('id').optional(),
    deep: Joi.boolean().optional().default(false),
    subordinate_to: Joi.string().optional(),
});

export const UpdateEmployeeSchema = EmployeeSchema.concat(Joi.object<User>().keys({
    email: UserSchema.extract('email').allow(null).default(null),
    mobile_phone: UserSchema.extract('mobile_phone').allow(null).default(null),
}));

export const GetAvatarPutUrlSchema = Joi.object({
    ContentType: Joi.string().pattern(/^image\/.+/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});
