import {FeedbackSchema, FeedbackStatus} from 'modules/feedbacks/schema';

import Joi from '../../../../utils/joi';

export const CreateFeedbackSchema = FeedbackSchema.fork(['id', 'read', 'read_at', 'employee', 'rank', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const SetReadSchema = Joi.boolean().invalid(false);

export const UpdateFeedbackSchema = CreateFeedbackSchema.fork(['type', 'text'], schema => schema.optional());

export const ApproveSchema = Joi.string().valid(FeedbackStatus.approved, FeedbackStatus.denied);
