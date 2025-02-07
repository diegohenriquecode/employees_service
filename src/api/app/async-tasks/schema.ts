import Joi from '../../../utils/joi';

export type GetImportSheetPutUrl = {
    ContentType: string
    ContentLength: number
    ContentDisposition: string
};

export const GetImportSheetPutUrlSchema = Joi.object({
    ContentType: Joi.string().pattern(/^application\/.+/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
    ContentDisposition: Joi.string().pattern(/^inline; filename=".*"$/),
});

export const ConfirmImportSheetUploadSchema = Joi.object({
    filePath: Joi.string().trim(),
});
