import {User, UserSchema} from 'modules/users/schema';

import Joi from '../../utils/joi';

export const REPRIMAND_STATUS = {
    DRAFT: 'DRAFT',
    GENERATED: 'GENERATED',
    SENT: 'SENT',
} as const;

export const ReprimandSchema = Joi.object<Reprimand>().keys({
    id: Joi.string(),

    description: Joi.string().trim().min(1).max(8192),
    status: Joi.string().allow(...Object.keys(REPRIMAND_STATUS)),
    employee: UserSchema.extract('id'),
    sector: UserSchema.extract('sector'),
    rank: UserSchema.extract('rank'),
    account: UserSchema.extract('account'),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type ReprimandProps = {
  description: string,
  status: keyof typeof REPRIMAND_STATUS
  docUrl?: string,
  attUrl?: string,
  manager?: string,
  date?: string,

  employee: string
  sector: string
  rank: User['rank']
  account: string
};

export type Reprimand = ReprimandProps & {
  id: string
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
};

export type InternalReprimand = Reprimand & {
    _DocKey?: string
    _AttKey?: string
};
