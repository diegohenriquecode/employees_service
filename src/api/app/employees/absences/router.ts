import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {NotFoundError} from 'modules/errors/errors';
import VacationsService from 'modules/vacations/service';

import {CreateAbsenceSchema, FindQueryArgs, QueryAbsencesSchema, UpdateAbsenceSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', validation(QueryAbsencesSchema, 'query'), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;
    const {type} = req.query as unknown as FindQueryArgs;

    const result = await VacationsService.config(config, user, account)
        .listByType(employeeId, type);

    res.send(result);
});

router.post('/', validation(CreateAbsenceSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;
    const result = await VacationsService.config(config, user, account)
        .create(employeeId, req.body);

    res.send(result);
});

router.get('/:absenceId', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, absenceId} = req.params as MergedParams<typeof req.params>;

    if (!employeeId) {
        throw new NotFoundError('Employee not found');
    }

    const result = await VacationsService.config(config, user, account)
        .retrieve(employeeId, absenceId);

    res.send(result);
});

router.put('/:absenceId', validation(UpdateAbsenceSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, absenceId} = req.params as MergedParams<typeof req.params>;

    if (!employeeId) {
        throw new NotFoundError('Employee not found');
    }

    const result = await VacationsService.config(config, user, account)
        .update(employeeId, absenceId, req.body);

    res.send(result);
});

router.delete('/:absenceId', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, absenceId} = req.params as MergedParams<typeof req.params>;

    if (!employeeId) {
        throw new NotFoundError('Employee not found');
    }

    await VacationsService.config(config, user, account)
        .delete(employeeId, absenceId);

    res.sendStatus(204);
});

type MergedParams<T> = T & {
    employeeId: string
};
