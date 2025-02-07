import {
    Evaluation,
    EvaluationAnswer,
    EvaluationAPE,
    EvaluationDecisionMatrix,
    EvaluationSchema,
    EvaluationStatus,
    EvaluationType, EvaluationTypeSchema,
    MultidirectionalEvaluationTypeSchema,
} from 'modules/evaluations/schema';
import Joi from 'utils/joi';

const DecisionMatrixAnswerSchema = Joi.object<EvaluationAnswer>().keys({
    id: Joi.string().required(),
    value: Joi.number().min(0).max(10).required(),
});

const CriteriaAnswerSchema = Joi.object<EvaluationAnswer>().keys({
    id: Joi.string().required(),
    value: Joi.number().min(1).max(4).required(),
});

export type ListEvaluationQuery = {
    type: EvaluationType,
    complete: boolean,
    from: Date,
    to: Date,
};

export const ListEvaluationQuerySchema = Joi.object<ListEvaluationQuery>().keys({
    type: EvaluationTypeSchema,
    complete: Joi.boolean().optional().default(false),
    from: Joi.date().iso().optional().default(() => new Date(0)),
    to: Joi.date().iso().optional().default(() => new Date()),
});

export type CreateEvaluationQuery = {
    deep: boolean
};

export type DeleteEvaluationQuery = {
    deep: boolean
    type: EvaluationType
};

export const CreateEvaluationQuerySchema = Joi.object<CreateEvaluationQuery>().keys({
    deep: Joi.boolean().optional().default(false),
});

export const DeleteMultipleEvaluationQuerySchema = Joi.object<DeleteEvaluationQuery>().keys({
    deep: Joi.boolean().optional().default(false),
    type: Joi.valid(EvaluationType.decision_matrix).optional().default(EvaluationType.decision_matrix),
});

export const CreateEvaluationSchema = Joi.object().keys({
    type: EvaluationSchema.extract('type').required(),
    deadline: EvaluationSchema.extract('deadline').optional(),
    sector: EvaluationSchema.extract('sector').optional(),

    evaluators: Joi.when('type', {
        is: MultidirectionalEvaluationTypeSchema,
        then: Joi.number().integer().min(2).max(10),
        otherwise: Joi.forbidden(),
    }),

    evaluatorsArray: Joi.when('type', {
        is: MultidirectionalEvaluationTypeSchema,
        then: Joi.array().items(Joi.string()).min(2).max(10).optional(),
        otherwise: Joi.forbidden(),
    }),
});

export const UpdateDecisionMatrixSchema = Joi.object<Evaluation>().keys({
    emotional: Joi.object<EvaluationDecisionMatrix['emotional']>().keys({
        answers: Joi.array().items(DecisionMatrixAnswerSchema).unique('id').max(20),
    }),
    technical: Joi.object<EvaluationDecisionMatrix['technical']>().keys({
        answers: Joi.array().items(DecisionMatrixAnswerSchema).unique('id').max(20),
    }),
    type: Joi.equal(EvaluationType.decision_matrix),
});

const UpdateAPESchema = Joi.object<Evaluation>().keys({
    criteria: Joi.object<EvaluationAPE['criteria']>().keys({
        answers: Joi.array().items(CriteriaAnswerSchema).unique('id').max(16),
    }),
    observations: Joi.string().allow('').optional(),
    type: Joi.equal(EvaluationType.ape),
});

const UpdateMultidirectionalSchema = Joi.object<Evaluation>().keys({
    type: MultidirectionalEvaluationTypeSchema,
    answers: Joi.object().unknown(true),
});

export const FullUpdateEvaluationSchema = Joi.alternatives(UpdateDecisionMatrixSchema, UpdateAPESchema, UpdateMultidirectionalSchema);

export const UpdateEvaluationDeadlineSchema = EvaluationSchema.extract('deadline');

export const UpdateEvaluationDisclosedToEmployeeSchema = EvaluationSchema.extract('disclosed_to_employee');

export const FinishEvaluationSchema = Joi.string().valid(EvaluationStatus.done);

export const SetReadSchema = Joi.boolean().invalid(false);

export const DetailEvaluationQuerySchema = Joi.object({
    toFill: Joi.boolean().optional().default(false),
});
