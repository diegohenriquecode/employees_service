import {CreateEvaluationSchema as CreateSchema} from 'api/app/employees/evaluations/schema';
import Joi from 'joi';
import {EvaluationType} from 'modules/evaluations/schema';

export const CreateEvaluationSchema = CreateSchema;

export const CreateMultipleEvaluationSchema = CreateEvaluationSchema
    .fork(['type'], () => Joi.invalid(EvaluationType.ape));
