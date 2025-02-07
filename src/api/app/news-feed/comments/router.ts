import config from 'config';
import express from 'express';
import can from 'middlewares/can';
import validation from 'middlewares/validation';
import FeedCommentService from 'modules/news-feed/comment/service';

import {CreateNewsCommentSchema, ListNewsCommentSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

type MergedParams<T> = T & {
    newsFeedId: string;
};

router.use('/:feedCommentId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params as MergedParams<typeof req.params>;
    const {feedCommentId} = req.params as unknown as {feedCommentId: string};

    const news = await FeedCommentService.config(config, user, account.id)
        .retrieve(newsFeedId, feedCommentId);

    res.locals.object = news;
    next();
});

router.post('/', validation(CreateNewsCommentSchema), can('create', 'NewsFeedComment'), async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params as MergedParams<typeof req.params>;

    const result = await FeedCommentService.config(config, user, account.id)
        .create(req.body, newsFeedId);

    res.send(result);
});

router.get('/', validation(ListNewsCommentSchema, 'query'), can('list', 'NewsFeedComment'), async (req, res) => {
    const {account, user} = res.locals;

    const {newsFeedId} = req.params as MergedParams<typeof req.params>;
    const {pageSize, next} = req.query;

    const result = await FeedCommentService.config(config, user, account.id)
        .listCommentsByPostWithPagination(
            newsFeedId,
            {pageSize, next},
        );

    res.send(result);

});

router.delete('/:newsFeedCommentId', can('delete', 'NewsFeedComment'), async (req, res) => {
    const {account, user, object} = res.locals;

    const {newsFeedCommentId} = req.params;
    const {newsFeedId} = req.params as MergedParams<typeof req.params>;

    await FeedCommentService.config(config, user, account.id)
        .delete(newsFeedId, newsFeedCommentId);

    res.send(object);
});
