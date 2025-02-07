import config from 'config';
import express from 'express';
import can from 'middlewares/can';
import validation from 'middlewares/validation';
import {ClausesType} from 'modules/feedbacks/schema';
import FeedbacksService from 'modules/feedbacks/service';

import {FeedbackListArgs, FeedbackListArgsSchema} from './schema';

const router = express.Router();
export default router;

router.get('/', validation(FeedbackListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as FeedbackListArgs;

    const mongoQuery = user.ability
        .mongoQuery('Feedback', 'list');

    if (query.format === 'xlsx') {
        const result = await FeedbacksService.config(config, user, account.id)
            .generateAsyncReport(query, mongoQuery as ClausesType);
        res.status(202).send(result);
    } else if (query.format === 'summary') {
        const result = await FeedbacksService.config(config, user, account.id)
            .summary(query, mongoQuery as ClausesType);
        res.send(result);
    } else {
        const result = await FeedbacksService.config(config, user, account.id)
            .list(query, mongoQuery as ClausesType);
        res.send(result);
    }
});

/**
 * @TODO: Colocar esse endpoint em api/app/employees
 */
router.get('/:employeeId/:feedbackId', can('detail', 'Feedback'), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, feedbackId} = req.params;

    const result = await FeedbacksService.config(config, user, account)
        .findById(employeeId, feedbackId);

    res.send(result);
});
