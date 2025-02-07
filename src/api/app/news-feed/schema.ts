import {NewsFeedImageUrlProps, NewsFeedSchema} from 'modules/news-feed/schema';
import Joi from 'utils/joi';

export const CreateNewsSchema = NewsFeedSchema
    .fork(['id', 'status', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const UpdateNewsSchema = NewsFeedSchema
    .fork(['id', 'status', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by', 'attachments_input'], schema => schema.forbidden());

export const GetUploadImageUrlSchema = Joi.object<NewsFeedImageUrlProps, true>({
    ContentType: Joi.string().pattern(/^image\/.+/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});
