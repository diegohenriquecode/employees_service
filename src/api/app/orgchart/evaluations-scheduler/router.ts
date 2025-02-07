import express from 'express';
import validation from 'middlewares/validation';
import EvaluationsSchedulerService from 'modules/evaluations-scheduler/service';

import config from '../../../../config';
import {CreateEvaluationsScheduleSchema, ListEvaluationsSchedulerQuery, ListEvaluationsSchedulerQuerySchema, UpdateEvaluationsScheduleSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.post('/', validation(CreateEvaluationsScheduleSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .create(sectorId, req.body);

    res.send(result);
});

router.get('/', validation(ListEvaluationsSchedulerQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {type} = req.query as ListEvaluationsSchedulerQuery;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .listBySector(sectorId, type);

    res.send(result);
});

router.get('/:evaluationsSchedulerId', async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId, evaluationsSchedulerId} = req.params;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .retrieve(sectorId, evaluationsSchedulerId);

    res.send(result);
});

router.put('/:evaluationsSchedulerId', validation(UpdateEvaluationsScheduleSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId, evaluationsSchedulerId} = req.params;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .update(sectorId, evaluationsSchedulerId, req.body);

    res.send(result);
});

router.delete('/:evaluationsSchedulerId', async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId, evaluationsSchedulerId} = req.params;

    await EvaluationsSchedulerService.config(config, user, account.id)
        .delete(sectorId, evaluationsSchedulerId);

    res.sendStatus(204);
});
