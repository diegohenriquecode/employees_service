import omit from 'lodash/omit';
import {User} from 'modules/users/schema';

import Joi from '../../utils/joi';

export enum EvaluationStatus {
    created = 'created',
    done = 'done',
    expired = 'expired',
}

export type EvaluationAnswer = {
    id: string
    value: number
};

export type EvaluationSection = {
    avg?: number
    answers: EvaluationAnswer[]
};

export type EvaluationObservations = {
    value: string
};

export enum EvaluationType {
    decision_matrix = 'decision-matrix',
    ape = 'ape',
    multidirectional = 'multidirectional.'
}

export const MultidirectionalRegexp = /^multidirectional\.\w*/;

export type EvaluationDecisionMatrix = {
    technical: EvaluationSection
    emotional: EvaluationSection
    type: EvaluationType.decision_matrix
};

export type EvaluationAPE = {
    criteria: EvaluationSection
    observations?: string
    type: EvaluationType.ape
};

type QuestionsResult = object;
type CategoriesResult = object;
type Result = {
    abitilies: QuestionsResult,
    competencies: CategoriesResult,
};

export type Answers = Record<string, number>;

export type EvaluationMultidirectional = {
    evaluations: Array<{status: EvaluationStatus, responsible: string, answers: Answers}>,
    result: {
        self: Result,
        evaluators: Result,
    },
};

export enum EvaluationTagType {
    batch = 'batch',
    deep = 'deep',
    schedule = 'schedule',
    single = 'single',
}

export type EvaluationProps = {
    type: EvaluationType
    daysLate?: number
    deadline: string | null
    finished_at?: string
    responsible: string | null
    tag?: string

    read?: boolean
    read_at?: string | null
    disclosed_to_employee: boolean
    result: number | DecisionMatrixResults | null,

    employee: string
    sector: string
    rank: User['rank']
    account: string
    status: EvaluationStatus
    removed?: boolean
};

export type EvaluationTypes = EvaluationDecisionMatrix | EvaluationAPE | EvaluationMultidirectional;

export type EvaluationPropsTyped = EvaluationProps & Partial<EvaluationTypes>;

export type EvaluationCore = {
    id: string
    rev?: number
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type Evaluation = EvaluationCore & EvaluationPropsTyped;

export type RetrieveEvaluationsResponse = {
    status: EvaluationStatus,
    responsible: string
};

export type DecisionMatrixEvaluation = EvaluationCore & EvaluationProps & EvaluationDecisionMatrix;

export type EvaluationCreateOnSectorEventMessage = Pick<Evaluation, 'account' | 'sector' | 'tag' | 'type' | 'deadline'> & {
    user: User
};

export type EvaluationRemoveOnSectorEventMessage = Pick<Evaluation, 'account' | 'sector'> & Pick<Partial<Evaluation>, 'type'> & {
    user: User
    requested_at: string
};

export type CreateEvaluationProps = Pick<EvaluationProps, 'tag' | 'type' | 'deadline' | 'employee' | 'rank' | 'sector' | 'account' | 'status'> & {evaluators?: number};
export type CreateMultidirectionalProps = Pick<CreateEvaluationProps, 'tag' | 'deadline' | 'evaluators' | 'type' | 'sector'> & {evaluatorsArray?: [string]};

export type UpdateEvaluationProps = EvaluationTypes & Pick<EvaluationProps, 'type'>;

export type UpdateEvaluationPropsGeneric<T> = T & Pick<EvaluationProps, 'type'>;
export type BatchUpdateEvaluationProps<T> = (T & Pick<Evaluation, 'employee' | 'status' | 'id'>)[];

export interface EvaluationService {
    create: (employee: User, props: CreateEvaluationProps) => Promise<Evaluation>;
    retrieve(evaluation: Evaluation, toFill?: boolean): Promise<Evaluation>;
    update(evaluation: Evaluation, patch: UpdateEvaluationProps): Promise<Evaluation>;
    finish(evaluation: Evaluation): Promise<Evaluation>;
}

export const EvaluationObservationsSchema = Joi.object<EvaluationObservations>().keys({
    value: Joi.string(),
});

export const EvaluationSectionSchema = Joi.object<EvaluationSection>().keys({
    avg: Joi.number(),
    answers: Joi.array().items({
        id: Joi.string(),
        value: Joi.number().min(0).max(10),
    }),
});

export const MultidirectionalEvaluationTypeSchema = Joi.string().pattern(MultidirectionalRegexp);

export const EvaluationTypeSchema = Joi.alternatives().try(
    Joi.valid(EvaluationType.ape, EvaluationType.decision_matrix),
    MultidirectionalEvaluationTypeSchema,
);

export const EvaluationSchema = Joi.object<Evaluation>().keys({
    id: Joi.string(),

    type: EvaluationTypeSchema,

    technical: Joi.when('type', {
        is: Joi.equal(EvaluationType.decision_matrix),
        then: EvaluationSectionSchema,
        otherwise: Joi.forbidden(),
    }),
    emotional: Joi.when('type', {
        is: Joi.equal(EvaluationType.decision_matrix),
        then: EvaluationSectionSchema,
        otherwise: Joi.forbidden(),
    }),

    criteria: Joi.when('type', {
        is: Joi.equal(EvaluationType.ape),
        then: EvaluationSectionSchema,
        otherwise: Joi.forbidden(),
    }),
    observations: Joi.when('type', {
        is: Joi.equal(EvaluationType.ape),
        then: EvaluationObservationsSchema,
        otherwise: Joi.forbidden(),
    }),

    deadline: Joi.date().min('now').iso().allow(null, 'null').empty('null').optional().default(null).raw(),
    finished_at: Joi.string().allow(null),
    responsible: Joi.string(),

    read: Joi.boolean(),
    read_at: Joi.string().isoDate(),

    employee: Joi.string(),
    sector: Joi.string(),
    rank: Joi.string(),
    account: Joi.string(),
    disclosed_to_employee: Joi.boolean(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export const out = (evaluation: Evaluation) => {
    return omit(evaluation, ['tag']);
};

export const outMatrixReport = (evaluation: DecisionMatrixEvaluation) => {
    return omit(evaluation, ['_employee_id', 'technical', 'emotional']);
};

export type ListProps = {
    page: number
    pageSize: number
    order: 'ASC' | 'DESC'
    orderBy: string
    daysLate?: number
    employee?: string
    responsible?: string
    from: Date
    onlyLast?: boolean
    sector?: string
    deep?: boolean
    status?: EvaluationStatus
    to: Date
    type?: string
    format: 'json' | 'xlsx' | 'summary'
    onlyCreated: boolean
};

export type ReportListProps = {
    from: string
    sector: string
    to: string
    type?: string
};

export type MultidirectionalEvaluationInstance = EvaluationMultidirectional & Evaluation;

export const DecisionMatrixReportHeaders = [
    'account',
    'id',
    'employee',
    'responsible',
    'deadline',
    'rank',
    'sector',
    'status',
    'type',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by',
    'daysLate',
    'finished_at',
    'read',
    'read_at',
];

export const MultidirectionalTypes = [
    'multidirectional.ie',
    'multidirectional.o',
    'multidirectional.hg',
    'multidirectional.dv',
    'multidirectional.et',
];

export enum DecisionMatrixResults {
    highPerformance = 'highPerformance',
    investment = 'investment',
    recognition = 'recognition',
    observation = 'observation',
    motivation = 'motivation',
    training = 'training',
    resignation = 'resignation',
}
