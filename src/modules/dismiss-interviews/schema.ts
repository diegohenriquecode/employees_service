import {SchemaMap} from 'joi';
import moment from 'moment';
import Joi from 'utils/joi';

export const DismissInterviewSchemaMap: SchemaMap<DismissInterview, false> = {
    id: Joi.string(),
    details: Joi.string().trim().min(1).max(8192),
    dismissed_at: Joi.string().isoDate()
        .custom((value, helper) => {

            const now = moment();
            const dismissedAt = moment(value);

            if (dismissedAt.isAfter(now)) {
                return helper.message({
                    custom: '"dismissed_at" needs to be before now',
                });
            }
            return value;
        }),

    employee: Joi.string(),
    account: Joi.string(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
};

export type DismissInterviewProps = {

    details: string;
    dismissed_at: string;
    manager?: string;

    employee: string;
    account: string;
};

export type DismissInterview = WithDefaultProps<DismissInterviewProps>;
export type CreateDismissInterviewProps = Omit<DismissInterviewProps, 'account' | 'employee'>;
