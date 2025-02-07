import express from 'express';
import adminCan from 'middlewares/admin-can';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';
import {BadRequestError} from 'modules/errors/errors';
import TutorialsService from 'modules/tutorials/service';
import {UploadCaptionSchema} from 'modules/videos/schema';
import multer from 'multer';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import {CreateTutorialSchema, GetThumbnailUrlSchema, SetDisabledSchema, UpdateTutorialSchema} from './schema';

const upload = multer();

const ALLOWED_CAPTION_EXTENSION = 'SRT';

const router = express.Router();
export default router;
const can = (permission: string) => adminCan(permissionResources.tutorials, permission);

router.post('/', can(PermissionTypes.create), validation(CreateTutorialSchema), async (req, res) => {
    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .create(req.body);
    res.send(result);
});

router.get('/', can(PermissionTypes.list), async (req, res) => {
    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .list();

    res.send(result);
});

router.get('/:id', can(PermissionTypes.detail), async (req, res) => {
    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .retrieve(req.params.id);
    res.send(result);
});

router.put('/:id/disabled', can(PermissionTypes.edit), validation(SetDisabledSchema), async (req, res) => {
    await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .setDisabled(req.params.id, req.body);

    res.sendStatus(204);
});

router.get('/thumbnail/url', can(PermissionTypes.edit), validation(GetThumbnailUrlSchema, 'query'), async (req, res) => {
    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .thumbnailUrl(req.query);

    res.send(result);
});

router.patch('/:id', can(PermissionTypes.edit), validation(UpdateTutorialSchema), async (req, res) => {
    const id = req.params.id;

    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .update(id, req.body);

    res.send(result);
});

router.put('/:videoId/url', can(PermissionTypes.edit), async (req, res) => {
    const {videoId} = req.params;

    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .updateTutorialVideo(videoId);

    res.send(result);
});

router.post('/:id/captions', can(PermissionTypes.create), upload.single('file'), validation(UploadCaptionSchema), async (req, res) => {
    const videoId = req.params.id;
    const {language} = req.body;

    if (!req.file) {
        throw new BadRequestError('File is required');
    }

    if (getFileExtension(req.file.originalname) !== ALLOWED_CAPTION_EXTENSION) {
        throw new BadRequestError('File must have .srt format');
    }

    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .uploadCaption(videoId, language, req.file);

    res.send(result);
});

router.patch('/:id/captions/:captionId', can(PermissionTypes.edit), upload.single('file'), async (req, res) => {
    const {id: videoId, captionId} = req.params;

    if (!req.file) {
        throw new BadRequestError('File is required');
    }

    if (getFileExtension(req.file.originalname) !== ALLOWED_CAPTION_EXTENSION) {
        throw new BadRequestError('File must have .srt format');
    }

    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .updateCaption(videoId, captionId, req.file);

    res.send(result);
});

router.get('/:id/captions', can(PermissionTypes.detail), async (req, res) => {
    const videoId = req.params.id;

    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .listCaptions(videoId);

    res.send(result);
});

router.delete('/:videoId/captions/:captionId', can(PermissionTypes.edit), async (req, res) => {
    const {videoId, captionId} = req.params;

    const result = await TutorialsService.config(config, res.locals.oauth.token.user.id)
        .removeCaption(videoId, captionId);

    res.send(result);
});

const getFileExtension = (fileName: string) => {
    return fileName.split('.').slice(-1)[0]?.toUpperCase();
};
