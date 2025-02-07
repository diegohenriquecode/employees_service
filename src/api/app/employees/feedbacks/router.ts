import express from 'express';
import can from 'middlewares/can';
import {FeedbackStatus} from 'modules/feedbacks/schema';
import FeedbacksService from 'modules/feedbacks/service';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import {ApproveSchema, CreateFeedbackSchema, SetReadSchema, UpdateFeedbackSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params as {employeeId: string};

    const result = await FeedbacksService.config(config, user, account)
        .listByEmployee(employeeId);

    res.send(result);
});

router.post('/', can('create', 'Feedback'), validation(CreateFeedbackSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params;
    const {type, text, sector} = req.body;

    const result = await FeedbacksService.config(config, user, account)
        .create(employeeId, {type, text, sector});

    res.send(result);
});

router.use('/:feedbackId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {employeeId, feedbackId} = req.params as unknown as {employeeId: string, feedbackId: string};
    const feedback = await FeedbacksService.config(config, user, account.id)
        .findById(employeeId, feedbackId);

    res.locals.object = feedback;
    next();
});

router.get('/:feedbackId', can('detail', 'Feedback'), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, feedbackId} = req.params;

    const result = await FeedbacksService.config(config, user, account)
        .findById(employeeId, feedbackId);
    res.send(result);
});

router.put('/:feedbackId', can('update', 'Feedback'), validation(UpdateFeedbackSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, feedbackId} = req.params;
    const {type, text} = req.body;

    const result = await FeedbacksService.config(config, user, account)
        .update(employeeId, feedbackId, {type, text});

    res.send(result);
});

router.put('/:feedbackId/read', can('update', 'Feedback', 'read'), validation(SetReadSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, feedbackId} = req.params;

    await FeedbacksService.config(config, user, account)
        .setRead(employeeId, feedbackId);

    res.sendStatus(204);
});

router.put('/:feedbackId/status', can('update', 'Feedback', 'status'), validation(ApproveSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, feedbackId} = req.params;
    const status = req.body as FeedbackStatus;

    await FeedbacksService.config(config, user, account)
        .allow(employeeId, feedbackId, status);

    res.sendStatus(204);
});

router.delete('/:feedbackId', can('delete', 'Feedback'), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, feedbackId} = req.params;

    await FeedbacksService.config(config, user, account)
        .delete(employeeId, feedbackId);

    res.sendStatus(204);
});
