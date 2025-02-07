import {User, UserSchema} from 'modules/users/schema';

import Joi from '../../utils/joi';

export const SUSPENSION_STATUS = {
    DRAFT: 'DRAFT',
    GENERATED: 'GENERATED',
    SENT: 'SENT',
} as const;

export const Suspensionschema = Joi.object<Suspension>().keys({
    id: Joi.string(),

    description: Joi.string().trim().min(1).max(8192),
    start: Joi.date().iso().raw(),
    end: Joi.date().iso().min(Joi.ref('start')).raw(),
    status: Joi.string().allow(...Object.keys(SUSPENSION_STATUS)),

    employee: UserSchema.extract('id'),
    sector: UserSchema.extract('sector'),
    rank: UserSchema.extract('rank'),
    account: UserSchema.extract('account'),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type SuspensionProps = {
  start: string
  end: string
  description: string,
  status: keyof typeof SUSPENSION_STATUS
  docUrl?: string,
  attUrl?: string,

  employee: string
  sector: string
  rank: User['rank']
  account: string
  manager?: string
};

export type Suspension = SuspensionProps & {
  id: string
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
};

export type InternalSuspension = Suspension & {
    _DocKey?: string
    _AttKey?: string
};
