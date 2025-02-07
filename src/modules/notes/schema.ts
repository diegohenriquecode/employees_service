import Joi from 'utils/joi';

import {UserSchema} from '../users/schema';

export const NoteSchema = Joi.object<Note>({
    id: Joi.string(),

    user: UserSchema.extract('id'),
    account: UserSchema.extract('account'),
    text: Joi.string().trim().min(3).max(8192),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type NoteProps = {
    text: string
    user: string
    account: string,
};

export type Note = NoteProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};
