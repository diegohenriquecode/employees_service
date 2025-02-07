import {SUSPENSION_STATUS, Suspensionschema} from 'modules/suspensions/schema';

import Joi from '../../../../utils/joi';

export const CreateSuspensionschema = Suspensionschema
    .fork(['id', 'status', 'employee', 'rank', 'account', 'created_at', 'sector', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const UpdateSuspensionschema = CreateSuspensionschema;

export const UpdateSuspensionstatusSchema = Suspensionschema.extract('status').valid(SUSPENSION_STATUS.GENERATED);

export const GetAttachmentPutUrlSchema = Joi.object({
    ContentType: Joi.string().pattern(/^image\/.+/).allow('application/pdf'),
    ContentDisposition: Joi.string().pattern(/^attachment; filename=".*"$/).allow('attachment'),
    ContentLength: Joi.number().integer().min(1).max(10 * 1024 * 1024),
});
