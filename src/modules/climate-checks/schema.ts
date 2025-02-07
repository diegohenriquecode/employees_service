import Joi from '../../utils/joi';
import {User, UserSchema} from '../users/schema';

export type ClimateCheck = {
    account: string
    _SectorPath: string
    _DateEmployee: string
    created_at: string
    created_by: string
    employee_sector?: string
    happy: number
    productive: number
    rank?: User['rank']
    sector?: string
    supported: number
    updated_at: string | null
    updated_by: string | null
};

export type ClimateCheckNumbers = Pick<ClimateCheck, 'happy' | 'productive' | 'supported'>;

export type ClimateCheckResponse = ClimateCheckNumbers & {
    date: string
    sector: string
};

const ClimateCheckAnswer = Joi.number().integer().min(1).max(5);

export const ClimateCheckSchema = Joi.object().keys({
    account: UserSchema.extract('account'),
    employee: UserSchema.extract('id'),
    sector: Joi.string().optional(),
    rank: UserSchema.extract('rank'),

    happy: ClimateCheckAnswer,
    productive: ClimateCheckAnswer,
    supported: ClimateCheckAnswer,

    created_at: Joi.string().isoDate().forbidden(),
    created_by: Joi.string().forbidden(),
    updated_at: Joi.string().isoDate().forbidden(),
    updated_by: Joi.string().forbidden(),
});
