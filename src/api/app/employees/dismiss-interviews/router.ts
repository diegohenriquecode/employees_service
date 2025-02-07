import express from 'express';
import can from 'middlewares/can';
import DismissInterviewsService from 'modules/dismiss-interviews/service';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import {CreateDismissInterviewSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', can('list', 'DismissInterview'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;

    const result = await DismissInterviewsService.config(config, user, account.id)
        .listByEmployee(employeeId);

    res.send(result);
});

router.post('/', can('create', 'DismissInterview'), validation(CreateDismissInterviewSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;

    const result = await DismissInterviewsService.config(config, user, account.id)
        .create(employeeId, req.body);

    res.send(result);
});

router.use('/:dismissInterviewId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {employeeId, dismissInterviewId} = req.params as unknown as {employeeId: string, dismissInterviewId: string};
    const dismiss = await DismissInterviewsService.config(config, user, account.id)
        .retrieve(dismissInterviewId, employeeId);

    res.locals.object = dismiss;
    next();
});

router.get('/:dismissInterviewId', can('detail', 'DismissInterview'), async (req, res) => {
    const {object} = res.locals;

    res.send(object);
});

type MergedParams<T> = T & {
    employeeId: string;
  };
