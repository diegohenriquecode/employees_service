import {User} from 'modules/users/schema';
import moment from 'moment';

import Joi from '../../utils/joi';

export const WorkingDaySchema = Joi.object({
    active: Joi.boolean(),
    start: Joi.when('active', {
        is: false,
        then: Joi.any().valid(null),
        otherwise: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    }),
    end: Joi.when('active', {
        is: false,
        then: Joi.any().valid(null),
        otherwise: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    }),
}).custom((object, helper) => {
    const {start, end} = object;

    const startTime = moment(start, 'HH:mm');
    const endTime = moment(end, 'HH:mm');

    if (endTime.isSameOrBefore(startTime)) {
        return helper.message({
            custom: '{{#label}}: "end" needs to be after "start"',
        });
    }
    return object;
});

export const EmployeeSchema = Joi.object<EmployeeProps, true>().keys({
    birthday: Joi.string().isoDate().allow(null).optional().default(null),
    effectivated_at: Joi.when('hired_at', {
        is: null,
        then: Joi.any().valid(null),
        otherwise: Joi.when('effective', {
            is: Joi.boolean().valid(false).allow(null),
            then: Joi.any().valid(null),
            otherwise: Joi.date().iso().min(Joi.ref('hired_at')).raw().allow(null).optional().default(null),
        }),
    }),
    effective: Joi.boolean().allow(null).optional().default(null),
    dismissed_at: Joi.when('hired_at', {
        is: null,
        then: Joi.any().valid(null),
        otherwise: Joi.date().iso().min(Joi.ref('hired_at')).raw().allow(null).optional().default(null),
    }),
    hired_at: Joi.when('effective', {
        is: null,
        then: Joi.any().valid(null),
        otherwise: Joi.string().isoDate().allow(null).optional().default(null),
    }),
    register: Joi.string().optional().allow(null).default(null),
    working_days: Joi.object(
        [0, 1, 2, 3, 4, 5, 6].reduce((o, key) => ({...o, [key]: WorkingDaySchema}), {})),
    monthly_hours: Joi.number().min(1).max(744).optional().allow(null).default(null),
});

export type EmployeeProps = {
  birthday?: string
  effectivated_at?: string
  effective?: string
  dismissed_at?: string
  hired_at?: string
  register?: string
  avatar_key?: string
  working_days?: {
    0: WorkingDay,
    1: WorkingDay,
    2: WorkingDay,
    3: WorkingDay,
    4: WorkingDay,
    5: WorkingDay,
    6: WorkingDay,
  }
  monthly_hours?: number
};

export type WorkingDay = {active: boolean, start: string | null, end: string | null};

export type EmployeeUpdatables = Partial<Omit<EmployeeProps, 'avatar_key'> & Pick<User, 'name' | 'mobile_phone' | 'email'>>;
