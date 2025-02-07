import Joi from '../../utils/joi';
import {User, UserSchema} from '../users/schema';

export const CoachingRegisterTodoSchema = Joi.object<CoachingRegisterTodo>().keys({
    id: Joi.string().forbidden(),

    what: Joi.string().trim().allow('').max(255),
    why: Joi.string().trim().allow('').max(255),
    who: Joi.string().trim().allow('').max(255),
    where: Joi.string().trim().allow('').max(255),
    when: Joi.string().trim().isoDate(),
    how: Joi.string().trim().allow('').max(255),
    how_much: Joi.string().trim().allow('').max(255),

    completed: Joi.boolean().forbidden(),
    completed_at: Joi.date().max('now').iso().forbidden(),
});

export const CoachingRegisterSchema = Joi.object<CoachingRegister>().keys({
    id: Joi.string(),

    current_state: Joi.string().max(8192),
    intended_state: Joi.string().max(8192),
    todos: Joi.array().items(CoachingRegisterTodoSchema),

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

export type CoachingRegisterTodo = {
    id: string

    what: string
    why: string
    who: string
    where: string
    when: string
    how: string
    how_much: string

    completed: boolean
    completed_at: string | null
};

export type CoachingRegisterProps = {
    current_state: string
    intended_state: string
    todos: CoachingRegisterTodo[]

    read: boolean
    read_at: string | null

    employee: string
    sector: string
    manager?: string
    rank: User['rank']
    account: string
};

export type CoachingRegister = CoachingRegisterProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export enum coachingRegisterStatus {
    inProgress = 'inProgress',
    completed = 'completed',
}
