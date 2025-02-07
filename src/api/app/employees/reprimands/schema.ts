import {REPRIMAND_STATUS, ReprimandSchema} from 'modules/reprimands/schema';

import Joi from '../../../../utils/joi';

export const CreateReprimandSchema = ReprimandSchema
    .fork(['id', 'status', 'employee', 'rank', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const UpdateReprimandSchema = CreateReprimandSchema;

export const UpdateReprimandStatusSchema = ReprimandSchema.extract('status').valid(REPRIMAND_STATUS.GENERATED);

export const GetAttachmentPutUrlSchema = Joi.object({
    ContentType: Joi.string().pattern(/^image\/.+/).allow('application/pdf'),
    ContentDisposition: Joi.string().pattern(/^attachment; filename=".*"$/).allow('attachment'),
    ContentLength: Joi.number().integer().min(1).max(10 * 1024 * 1024),
    date: Joi.string()?.isoDate(),
});
