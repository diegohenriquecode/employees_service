
import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {AttachmentUrlFileData} from 'modules/contents/schema';
import ContentsService from 'modules/contents/service';
import {BadRequestError} from 'modules/errors/errors';
import TrainingTopicsService from 'modules/training-topics/service';
import {UploadCaptionSchema} from 'modules/videos/schema';
import multer from 'multer';

import {CreateTrainingTopicContentSchema, GetAttachmentPutUrlSchema, UpdateTrainingTopicContentSchema} from './schema';

const upload = multer();

const ALLOWED_CAPTION_EXTENSION = 'SRT';

const router = express.Router({mergeParams: true});
export default router;

router.post('/', validation(CreateTrainingTopicContentSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId, topicId} = req.params as MergedParams<typeof req.params>;

    const result = await ContentsService.config(config, user.id, account.id).create(req.body);

    await TrainingTopicsService.config(config, user, account.id, trainingId).update(topicId, {content: result.id});

    res.send(result);
});

router.get('/:contentId', async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId, topicId, contentId} = req.params as MergedParams<typeof req.params>;

    const topic = await TrainingTopicsService.config(config, user, account.id, trainingId).retrieve(topicId);
    if (topic.content !== contentId) {
        throw new BadRequestError('Content does not belong to topic');
    }

    const result = await ContentsService.config(config, user.id, account.id)
        .retrieve(contentId);

    res.send(result);
});

router.put('/:contentId', validation(UpdateTrainingTopicContentSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId, topicId, contentId} = req.params as MergedParams<typeof req.params>;

    const topic = await TrainingTopicsService.config(config, user, account.id, trainingId).retrieve(topicId);
    if (topic.content !== contentId) {
        throw new BadRequestError('Content does not belong to topic');
    }

    const result = await ContentsService.config(config, user.id, account.id)
        .update(contentId, req.body);

    res.send(result);
});

router.post('/video', async (req, res) => {
    const {account, user} = res.locals;

    const result = await ContentsService.config(config, user.id, account.id).createVideo();

    res.send(result);
});

router.get('/:contentId/attUrl', validation(GetAttachmentPutUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;
    const {trainingId, topicId, contentId} = req.params as MergedParams<typeof req.params>;

    const topic = await TrainingTopicsService.config(config, user, account.id, trainingId).retrieve(topicId);
    if (topic.content !== contentId) {
        throw new BadRequestError('Content does not belong to topic');
    }

    const result = await ContentsService.config(config, user.id, account.id)
        .attachmentUrl(contentId, req.query as unknown as AttachmentUrlFileData);

    res.send(result);
});

router.delete('/:contentId/attachments/:attachmentId', async (req, res) => {
    const {account, user} = res.locals;
    const {trainingId, topicId, contentId, attachmentId} = req.params as MergedParams<typeof req.params>;

    const topic = await TrainingTopicsService.config(config, user, account.id, trainingId).retrieve(topicId);
    if (topic.content !== contentId) {
        throw new BadRequestError('Content does not belong to topic');
    }

    await ContentsService.config(config, user.id, account.id)
        .deleteAttachment(contentId, attachmentId);

    res.sendStatus(204);
});

router.post('/:contentId/captions', upload.single('file'), validation(UploadCaptionSchema), async (req, res) => {
    const {account, user} = res.locals;
    const {contentId} = req.params;
    const {language} = req.body;

    if (!req.file) {
        throw new BadRequestError('File is required');
    }

    if (getFileExtension(req.file.originalname) !== ALLOWED_CAPTION_EXTENSION) {
        throw new BadRequestError('File must have .srt format');
    }

    const result = await ContentsService.config(config, user.id, account.id)
        .uploadCaption(contentId, language, req.file);

    res.send(result);
});

router.patch('/:contentId/captions/:captionId', upload.single('file'), async (req, res) => {
    const {account, user} = res.locals;
    const {contentId, captionId} = req.params;

    if (!req.file) {
        throw new BadRequestError('File is required');
    }

    if (getFileExtension(req.file.originalname) !== ALLOWED_CAPTION_EXTENSION) {
        throw new BadRequestError('File must have .srt format');
    }

    const result = await ContentsService.config(config, user.id, account.id)
        .updateCaption(contentId, captionId, req.file);

    res.send(result);
});

router.get('/:contentId/captions', async (req, res) => {
    const {account, user} = res.locals;
    const {contentId} = req.params;

    const result = await ContentsService.config(config, user.id, account.id)
        .listCaptions(contentId);

    res.send(result);
});

router.delete('/:contentId/captions/:captionId', async (req, res) => {
    const {account, user} = res.locals;
    const {contentId, captionId} = req.params;

    const result = await ContentsService.config(config, user.id, account.id)
        .removeCaption(contentId, captionId);

    res.send(result);
});

const getFileExtension = (fileName: string) => {
    return fileName.split('.').slice(-1)[0]?.toUpperCase();
};

type MergedParams<T> = T & {
    trainingId: string;
    topicId: string;
  };
