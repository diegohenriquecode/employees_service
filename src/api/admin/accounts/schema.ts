import Joi from 'joi';
import {AccountSchema, ComercialAccountSchema, Account} from 'modules/accounts/schema';
import {SessionsReportsGroup} from 'modules/sessions-reports/schema';
import {UserSchema} from 'modules/users/schema';

export type InPayloadResponsible = {
    name: string
    email: string
    password: string
};

export type GetLogoPutUrl = {
    ContentType: string
    ContentLength: number
};

export type AccountDTO = Omit<Account, 'responsible'> & {
    logoUrl?: string,
    contractUrl?: string,
    responsible: {
        name?: string
        email?: string
    }
};

export type FindQueryArgs = {
    to: Date
    from: Date
    groupBy: SessionsReportsGroup
};

export const CreateComercialAccountSchema = ComercialAccountSchema
    .fork(['id', 'disabled', 'is_demo'], (schema) => schema.forbidden())
    .append({
        responsible: Joi.object<InPayloadResponsible>().keys({
            name: UserSchema.extract('name'),
            email: Joi.string().email().lowercase().trim().empty(''),
            password: UserSchema.extract('password'),
        }),
    });

export const CreateTrainingAccountSchema = AccountSchema
    .fork(['id', 'disabled', 'expiry_date', 'is_demo', 'max_users', 'modules', 'timezone', 'lang', 'colors'], (schema) => schema.forbidden())
    .append({
        responsible: Joi.object<InPayloadResponsible>().keys({
            name: UserSchema.extract('name'),
            email: Joi.string().email().lowercase().trim().empty(''),
            password: UserSchema.extract('password'),
        }),
    });

export const SetDisabledSchema = AccountSchema.extract('disabled');
export const SetExpiryDateSchema = AccountSchema.extract('expiry_date');

export const UpdateComercialAccountSchema = CreateComercialAccountSchema
    .fork([
        'name',
        'subdomain',
        'max_users',
        'responsible',
        'responsible.name', 'responsible.email', 'responsible.password',
        'modules',
        'timezone',
        'lang',
        'cnpj',
        'company_name',
        'address',
        'address.postal_code', 'address.street', 'address.number', 'address.neighborhood', 'address.city', 'address.state',
        'financial_responsible',
        'financial_responsible.name', 'financial_responsible.email', 'financial_responsible.phone',
        'value_per_user', 'min_users_number', 'close_invoice', 'payment_day', 'contract_initial_day', 'contract_final_day',
    ], (schema) => schema.optional())
    .fork(['is_demo'], (schema) => schema.forbidden().strip());

export const UpdateAccountResponsiblePassword = Joi.object({
    password: Joi.string().min(8).required(),
});

export const UpdateTrainingAccountSchema = CreateTrainingAccountSchema
    .fork(['name', 'subdomain', 'max_users', 'responsible', 'responsible.name', 'responsible.email', 'responsible.password', 'modules', 'timezone', 'lang'], (schema) => schema.optional())
    .fork(['is_demo'], (schema) => schema.forbidden().strip());

export const GetLogoPutUrlSchema = Joi.object({
    ContentType: Joi.string().pattern(/^image\/.+/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});

export const GetUploadContractUrlSchema = Joi.object({
    ContentType: Joi.string().pattern(/^application\/pdf$/).required(),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});

export const QuerySessionsSchema = Joi.object<FindQueryArgs>().keys({
    from: Joi.date().max('now').iso().optional().default(new Date(0)),
    to: Joi.date().min(Joi.ref('from')).iso().optional().default(() => new Date()),
    groupBy: Joi.string().valid('day', 'month').optional().default('day'),
}).unknown(true);
