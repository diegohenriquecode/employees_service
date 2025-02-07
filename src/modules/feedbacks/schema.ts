import Joi from '../../utils/joi';
import {User, UserSchema} from '../users/schema';

export enum FeedbackType {
    compliment = 'compliment',
    guidance = 'guidance',
}

export enum FeedbackStatus {
    approved = 'approved',
    pending_approval = 'pending_approval',
    denied = 'denied',
}

export type FeedbackProps = {
    type: FeedbackType
    text: string

    read: boolean
    read_at: string | null

    employee: string
    sector: string
    rank: User['rank']
    account: string,
    status: FeedbackStatus
};

export type Feedback = FeedbackProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export const FeedbackSchema = Joi.object<Feedback>().keys({
    id: Joi.string(),

    type: Joi.string().allow('compliment', 'guidance'),
    text: Joi.string().trim().min(1).max(8192),

    read: Joi.boolean(),
    read_at: Joi.string().isoDate(),

    employee: UserSchema.extract('id'),
    sector: UserSchema.extract('sector'),
    rank: UserSchema.extract('rank'),
    account: UserSchema.extract('account'),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export interface validateFeedbackStatusOnCreateParams {
    userIsManagerAbove: boolean
    employeeIsManagerAbove: boolean
    userIsSubordinateBelow: boolean
    userSectorIsDiferentOfEmployeeUserSector: boolean
}

export type ClausesType = Record<string, Record<string, string | string[]>>;
