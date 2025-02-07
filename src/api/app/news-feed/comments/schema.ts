import Joi from 'joi';
import {NewsFeedCommentSchema} from 'modules/news-feed/comment/schema';

export const CreateNewsCommentSchema = NewsFeedCommentSchema
    .fork(['id', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by', 'newsFeedId', 'employee'], schema => schema.forbidden());

export const ListNewsCommentSchema = Joi.object().keys({
    pageSize: Joi.number().integer().min(1).optional().default(3),
    next: Joi.string().optional().allow(null),
});

export const UpdateNewsCommentSchema = NewsFeedCommentSchema
    .fork(['id', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by', 'newsFeedId', 'employee'], schema => schema.forbidden());
