import moment from 'moment';
import Joi from 'utils/joi';

import {QuerySchema} from '../../api/app/employees/schema';

export enum NonScalablePendingActionsTypes {
    FeedbackNotRead = 'FeedbackNotRead',
    EvaluationNotRead = 'EvaluationNotRead',
    CoachingRegisterNotRead = 'CoachingRegisterNotRead',
}

export enum ScalablePendingActionsTypes {
    EvaluationNotDone = 'EvaluationNotDone',
    FeedbackPendingApproval = 'FeedbackPendingApproval',
    LatePendingActionType = 'LatePendingActionType',
}

export const PendingActionsTypes = {
    ...NonScalablePendingActionsTypes,
    ...ScalablePendingActionsTypes,
};

export enum PendingActionsStatus {
    DONE = 'done',
    PENDING = 'pending',
}

export type PendingActionsListArgs = {
    history: boolean
    type: string[]
    status: PendingActionsStatus
    from: string
    to: string
    next?: string
    pageSize: number
    includeDisabled?: boolean
};

export const PendingActionsListSchemaMap = QuerySchema.append<PendingActionsListArgs>({
    history: Joi.boolean().optional().default(false),
    type: Joi.optional()
        .when('history', {
            is: Joi.exist().equal(true),
            then: Joi.array().items(Joi.string()).optional().default([]),
        }),
    status: Joi.optional()
        .when('history', {
            is: Joi.exist().equal(true),
            then: Joi.string().allow('').valid(...Object.values(PendingActionsStatus)).optional(),
            otherwise: Joi.string().allow('').valid(PendingActionsStatus.PENDING).optional().default(PendingActionsStatus.PENDING),
        }),
    from: Joi.string().isoDate().optional().default(moment(0).toISOString()),
    to: Joi.string().isoDate().optional().default(() => moment().toISOString()),
    next: Joi.string().optional(),
    pageSize: Joi.optional()
        .when('history', {
            is: Joi.exist().equal(true),
            then: Joi.number().integer().min(1).max(100).optional().default(10),
            otherwise: Joi.number().integer().min(1).max(100).optional(),
        }),
});

export type PendingActionType = typeof PendingActionsTypes[keyof typeof PendingActionsTypes];

export type PendingAction = {
    id: string;
    account: string;
    created_at: string;
    created_by: string;
    date: string;
    employee: string;
    sector: string,
    type: PendingActionType;
    data: PendingActionData;
};

export type PendingActionData = {
    employee: string;
    type: PendingActionType;
    sector: string;
    since: string;
    index: number;
    data: PendingActionData;
};

export type LatePendingAction = {
    account: string,
    employee: string,
    sector: string,
    type: string,
    source: string,
    created_at: string,
    data: PendingActionData,
};
