import {AccountSchema} from 'modules/accounts/schema';
import {EmployeeProps, EmployeeSchema} from 'modules/employees/schema';
import {RankSchema} from 'modules/ranks/schema';

import Joi from '../../utils/joi';
import {BarueriAbility} from '../roles/service';

// Matches a valid brazilian cellphone number (only numbers)
const phoneRegex = /^\d{11}$/;

export type UserProps = {
    sector: string
    sectors: RelationSector

    rank: string
    username: string
    name: string
    email?: string
    mobile_phone?: string
    password: string
    change_password: boolean
    roles: string
    scopes: string
    disabled?: boolean

    account: string
    client_id: string

    id?: string
} & EmployeeProps;

export type User = UserProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type Relation = {
    account: string
    user: string

    sector: string
    subordinate_to: string
    is_manager: boolean
    created_at: string
};

export type OrderByRaw = {
    field: string,
    expression:string,
};

export type RelationSector = Record<string, RelationSectorValue>;

type RelationSectorValue = {
    subordinate_to: string,
    created_at: string,
    is_manager: boolean,
};

export type RelationDelete = Pick<Relation, 'account' | 'user' | 'sector'>;

export type AppUser = User & {
    ability: BarueriAbility,
    rolesArray: string[],
};

export type UserHierarchical = {
    account: string,
    user_id: string,
    hierarchical_level: number | null,
    rank: string | null,
    sector: string,
    subordinate_to: string | null,
    boss_hierarchical_level: number | null,
    boss_rank: string | null
};

export const PureUserSchema = Joi.object<User>().keys({
    account: AccountSchema.extract('id').forbidden(),
    id: Joi.string(),

    sector: Joi.string(),
    rank: RankSchema.extract('id'),
    username: Joi.string().trim().min(3).max(255),
    name: Joi.string().trim().min(3).max(255).replace(/\s+/g, ' '),
    email: Joi.string().email().lowercase().trim().allow(null).optional(),
    mobile_phone: Joi.string().trim().allow(null).optional().pattern(phoneRegex),
    password: Joi.string().trim().min(8).max(255),
    change_password: Joi.boolean().optional(),
    roles: Joi.string().trim(),
    scopes: Joi.string().trim().allow(''),
    disabled: Joi.bool().optional(),
    client_id: Joi.string().forbidden(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export const UserSchema = EmployeeSchema.concat(PureUserSchema);
