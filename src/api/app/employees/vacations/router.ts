import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {AbsenceType} from 'modules/vacations/schema';
import VacationsService from 'modules/vacations/service';

import {CreateVacationSchema, UpdateVacationSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;

    const result = await VacationsService.config(config, user, account)
        .listByType(employeeId, AbsenceType.VACATION);

    res.send(result);
});

router.post('/', validation(CreateVacationSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;

    const result = await VacationsService.config(config, user, account)
        .create(employeeId, req.body);

    res.send(result);
});

router.get('/:vacationId', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, vacationId} = req.params as MergedParams<typeof req.params>;

    const result = await VacationsService.config(config, user, account)
        .retrieve(employeeId, vacationId);

    res.send(result);
});

router.put('/:vacationId', validation(UpdateVacationSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, vacationId} = req.params as MergedParams<typeof req.params>;

    const result = await VacationsService.config(config, user, account)
        .update(employeeId, vacationId, req.body);

    res.send(result);
});

router.delete('/:vacationId', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, vacationId} = req.params as MergedParams<typeof req.params>;

    await VacationsService.config(config, user, account)
        .delete(employeeId, vacationId);

    res.sendStatus(204);
});

type MergedParams<T> = T & {
  employeeId: string
};
