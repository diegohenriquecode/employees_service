import Joi from 'joi';
import {UserSchema} from 'modules/users/schema';

export type NewsFeedCommentProps = {
    text: string
    account: string
    employee: string
    newsFeedId: string
};

export type NewsFeedComment = NewsFeedCommentProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export const NewsFeedCommentSchema = Joi.object<NewsFeedComment>().keys({
    id: Joi.string(),

    text: Joi.string().trim().min(1).max(2200),

    account: UserSchema.extract('account'),
    employee: UserSchema.extract('id'),
    newsFeedId: Joi.string(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type ListProps = {
    to: string
    from: string
    page: number
    pageSize: number
    order?: 'ASC' | 'DESC'
    orderBy?: string
    active: boolean
};
