import config from 'config';
import express from 'express';
import maintenance from 'middlewares/maintenance';
import validation from 'middlewares/validation';
import {AttachmentUrlFileData} from 'modules/contents/schema';
import {AttachmentPropsSchema, NewsFeedImageUrlProps} from 'modules/news-feed/schema';
import NewsFeedService from 'modules/news-feed/service';

import newsFeedComments from './comments/router';
import {CreateNewsSchema, GetUploadImageUrlSchema, UpdateNewsSchema} from './schema';

const router = express.Router();
export default router;

if (config.newsFeedMaintenance) {
    router.use(maintenance);
}

router.post('/', validation(CreateNewsSchema), async (req, res) => {
    const {account, user} = res.locals;

    const result = await NewsFeedService.config(config, user, account.id)
        .create(req.body);

    res.send(result);
});

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const result = await NewsFeedService.config(config, user, account.id)
        .list();

    res.send(result);
});

router.get('/:newsFeedId', async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params;

    const result = await NewsFeedService.config(config, user, account.id)
        .retrieve(newsFeedId);

    res.send(result);
});

router.get('/:newsFeedId/imageUrl', validation(GetUploadImageUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params;
    const query = req.query as unknown as NewsFeedImageUrlProps;

    const result = await NewsFeedService.config(config, user, account.id)
        .getImageUploadUrl(newsFeedId, query);

    res.send(result);
});

router.get('/:newsFeedId/attachment', validation(AttachmentPropsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params;
    const query = req.query as unknown as AttachmentUrlFileData;

    const result = await NewsFeedService.config(config, user, account.id)
        .getAttachmentUploadUrl(newsFeedId, query);

    res.send(result);
});

router.get('/:newsFeedId/uploadVideo', async (req, res) => {
    const {account, user} = res.locals;

    const result = await NewsFeedService.config(config, user, account.id)
        .createVideo();

    res.send(result);
});

router.delete('/:newsFeedId/attachment/:attachmentId', async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId, attachmentId} = req.params;

    const result = await NewsFeedService.config(config, user, account.id)
        .removeAttachment(newsFeedId, attachmentId);

    res.send(result);
});

router.put('/:newsFeedId/video', validation(UpdateNewsSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params;

    const result = await NewsFeedService.config(config, user, account.id)
        .updateVideo(newsFeedId, req.body);

    res.send(result);
});

router.put('/:newsFeedId', validation(UpdateNewsSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params;

    const result = await NewsFeedService.config(config, user, account.id)
        .update(newsFeedId, req.body);

    res.send(result);
});

router.delete('/:newsFeedId', async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params;

    await NewsFeedService.config(config, user, account.id)
        .delete(newsFeedId);

    res.sendStatus(204);
});

router.use('/:newsFeedId/comments', newsFeedComments);
