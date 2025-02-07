import moment from 'moment-timezone';
import {FileData} from 'utils/storage-service';

import Joi from '../../utils/joi';

const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
// reference: https://stackoverflow.com/a/7933253

// Matches a valid CSS color, it can be one of hex, rgb, rgba, hsl, hsla.
const colorRegex = /^#([\da-f]{3}){1,2}$|^#([\da-f]{4}){1,2}$|(rgb|hsl)a?\((\s*-?\d+%?\s*,){2}(\s*-?\d+%?\s*,?\s*\)?)(,\s*(0?\.\d+)?|1)?\)/;
// https://www.regextester.com/103656

const accountModules = {
    climateCheck: 'climateCheck',
};

export enum AccountType {
    EXPERIMENTAL = 'Experimental',
    FREE = 'Free',
    PAID = 'Paid'
}

export enum AccountStatus {
    preparing = 'preparing',
    ready = 'ready',
}

const ColorsSchema = Joi.object().keys({
    primary: Joi.string().pattern(colorRegex),
    secondary: Joi.string().pattern(colorRegex),
    accent: Joi.string().pattern(colorRegex),
}).optional();

export const AccountSchema = Joi.object<Account>().keys({
    id: Joi.string(),

    name: Joi.string().trim().min(3).max(255),
    subdomain: Joi.string().pattern(subdomainRegex),
    disabled: Joi.boolean(),
    is_demo: Joi.boolean().optional().default(false),
    expiry_date: Joi.string().isoDate().optional().allow('')
        .custom((expiry_date, helpers) => {
            const now = moment();
            if (moment(expiry_date).isBefore(now)) {
                return helpers.message({
                    custom: '"expiry_date" cannot be in the past',
                });
            }

            return expiry_date;
        }),
    responsible: Joi.string(),
    max_users: Joi.number().integer().min(1).allow(null),

    lang: Joi.string().valid('ptBR').optional(),
    colors: ColorsSchema,

    modules: Joi.object({
        [accountModules.climateCheck]: Joi.boolean(),
    }),
    timezone: Joi.string()
        .valid(...moment.tz.names())
        .default('America/Sao_Paulo')
        .optional(),
    created_at: Joi.string().isoDate().forbidden(),
    created_by: Joi.string().forbidden(),
    updated_at: Joi.string().isoDate().forbidden(),
    updated_by: Joi.string().forbidden(),
});

export const ComercialAccountSchema = Joi.object<ComercialAccount>().keys({
    id: Joi.string(),

    type: Joi.string().required().valid(...Object.values(AccountType)),

    cnpj: Joi.string().optional().allow(null),
    company_name: Joi.string().optional().allow(null),
    address: Joi.object({
        postal_code: Joi.string().optional().allow(null),
        street: Joi.string().optional().allow(null),
        number: Joi.string().optional().allow(null),
        neighborhood: Joi.string().optional().allow(null),
        city: Joi.string().optional().allow(null),
        state: Joi.string().optional().allow(null),
        additional_info: Joi.string().optional().allow(null),
    }),
    financial_responsible: Joi.object({
        name: Joi.string().optional().allow(null),
        email: Joi.string().optional().allow(null),
        phone: Joi.string().optional().allow(null),
    }),
    name: Joi.string().trim().min(3).max(255),
    subdomain: Joi.string().pattern(subdomainRegex),
    disabled: Joi.boolean(),
    is_demo: Joi.boolean().optional().default(false),
    expiry_date: Joi.string().isoDate().optional().allow('')
        .custom((expiry_date, helpers) => {
            const now = moment();
            if (moment(expiry_date).isBefore(now)) {
                return helpers.message({
                    custom: '"expiry_date" cannot be in the past',
                });
            }

            return expiry_date;
        }),

    value_per_user: Joi.string().optional().allow(null),
    min_users_number: Joi.number().optional().allow(null),
    close_invoice: Joi.number().optional().allow(null),
    payment_day: Joi.number().optional().allow(null),
    contract_initial_day: Joi.string().isoDate().optional().allow(null),
    contract_final_day: Joi.string().isoDate().optional().allow(null),

    responsible: Joi.string(),
    max_users: Joi.number().integer().min(1).allow(null),

    lang: Joi.string().valid('ptBR').optional(),
    colors: ColorsSchema,

    modules: Joi.object({
        [accountModules.climateCheck]: Joi.boolean(),
    }),
    timezone: Joi.string()
        .valid(...moment.tz.names())
        .default('America/Sao_Paulo')
        .optional(),
    created_at: Joi.string().isoDate().forbidden(),
    created_by: Joi.string().forbidden(),
    updated_at: Joi.string().isoDate().forbidden(),
    updated_by: Joi.string().forbidden(),
})

    .when(Joi.object({is_demo: true}).unknown(), {
        then: Joi.object({
            disabled: Joi.forbidden(),
            max_users: Joi.forbidden(),
            lang: Joi.forbidden(),
            colors: Joi.forbidden(),
            modules: Joi.forbidden(),
            timezone: Joi.forbidden(),
        }),
    });

type modulesProps = {
    climateCheck: boolean,
};

export type AccountProps = {
    cnpj?: string,
    type: AccountType,
    company_name?: string,
    address: {
        postal_code?: string,
        street?: string,
        number?: string,
        neighborhood?: string,
        city?: string,
        state?: string,
        additional_info?: string,
    },
    financial_responsible: {
        name?: string,
        email?: string,
        phone?: string,
    },
    value_per_user?: string,
    min_users_number?: number,
    close_invoice?: number,
    payment_day?: number,
    contract_initial_day?: string,
    contract_final_day?: string,
    name: string
    subdomain: string
    disabled: boolean
    is_demo: boolean
    status: string
    responsible: string
    max_users: number | null
    logo_key?: string | null
    contract_key?: string | null
    modules: modulesProps,
    timezone: string,
    expiry_date?: string,
};

export type AccountSpecifics = {
    lang: string,
    colors: {
        primary: string,
        secondary: string,
        accent: string
    }
};

export type CommercialAccountProps = {
    cnpj?: string,
    company_name?: string,
    address?: {
        postal_code?: string,
        street?: string,
        number?: string,
        neighborhood?: string,
        city?: string,
        state?: string,
        additional_info?: string,
    },
    financial_responsible: {
        name?: string,
        email?: string,
        phone?: string,
    },
};

export type Account = AccountProps & AccountSpecifics & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type ComercialAccount = AccountProps & AccountSpecifics & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type AccountContractUrlProps = Required<Pick<FileData, 'ContentType' | 'ContentLength'>>;

export function isFullAddress(address?: Account['address']): address is Required<Account['address']> {
    if (!address) {
        return false;
    }

    return !!address.street &&
        !!address.number &&
        !!address.postal_code &&
        !!address.neighborhood &&
        !!address.city &&
        !!address.state;
}
