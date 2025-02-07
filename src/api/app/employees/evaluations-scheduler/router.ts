import {
    ListEvaluationsSchedulerQuery,
    ListEvaluationsSchedulerQuerySchema,
} from 'api/app/orgchart/evaluations-scheduler/schema';
import express from 'express';
import validation from 'middlewares/validation';
import EvaluationsSchedulerService from 'modules/evaluations-scheduler/service';
import {EvaluationType} from 'modules/evaluations/schema';

import config from '../../../../config';
import {CreateEmployeeEvaluationsScheduleSchema, EmployeeEvaluationSchedulerParams, UpdateEmployeeEvaluationsScheduleSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.post('/', validation(CreateEmployeeEvaluationsScheduleSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;
    const body = {...req.body, id: EvaluationType.ape};
    const sector = employeeId;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .create(sector, body);

    res.send(result);
});

router.get('/', validation(ListEvaluationsSchedulerQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;
    const sectorId = employeeId;
    const {type} = req.query as ListEvaluationsSchedulerQuery;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .listBySector(sectorId, type);

    res.send(result);
});

router.get('/ape', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params as EmployeeEvaluationSchedulerParams;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .retrieve(employeeId, 'ape');

    res.send(result);
});

router.put('/ape', validation(UpdateEmployeeEvaluationsScheduleSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const result = await EvaluationsSchedulerService.config(config, user, account.id)
        .update(employeeId, 'ape', req.body);

    res.send(result);
});

router.delete('/ape', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params as EmployeeEvaluationSchedulerParams;

    await EvaluationsSchedulerService.config(config, user, account.id)
        .delete(employeeId, 'ape');

    res.sendStatus(204);
});
