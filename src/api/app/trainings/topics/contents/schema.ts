import {pick} from 'lodash';
import {AttachmentUrlFileData, ContentSchemaMap, ContentType, UpdateContentProps} from 'modules/contents/schema';
import Joi from 'utils/joi';

export const UpdateTrainingTopicContentSchema = Joi.object<UpdateContentProps, true>({
    type: Joi.string().valid(ContentType.Image, ContentType.Text, ContentType.Video),
    value: Joi.string(),
}).options({presence: 'optional'});

export const CreateTrainingTopicContentSchema = Joi.object(
    pick(ContentSchemaMap, 'type', 'value'),
);

export const GetAttachmentPutUrlSchema = Joi.object<AttachmentUrlFileData, true>({
    ContentType: Joi.string().pattern(/^image\/.+/).allow(
        'application/pdf', // .pdf
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'text/plain', //.txt
    ),
    ContentDisposition: Joi.string().pattern(/^inline; filename=".*"$/),
    ContentLength: Joi.number().integer().min(1).max(10 * 1024 * 1024),
    FileName: Joi.string(),
});
