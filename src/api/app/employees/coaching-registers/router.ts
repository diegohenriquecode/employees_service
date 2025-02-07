import express from 'express';
import can from 'middlewares/can';
import CoachingRegistersService from 'modules/coaching-registers/service';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import {CreateCoachingRegisterSchema, SetReadSchema, UpdateCoachingRegisterSchema} from './schema';
import todosRouter from './todos/router';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', can('list', 'CoachingRegister'), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params;

    const result = await CoachingRegistersService.config(config, user, account)
        .listByEmployee(employeeId);

    res.send(result);
});

router.post('/', can('create', 'CoachingRegister'), validation(CreateCoachingRegisterSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId} = req.params;
    const {current_state, intended_state, todos, sector} = req.body;

    const result = await CoachingRegistersService.config(config, user, account)
        .create(employeeId, {current_state, intended_state, todos, sector});

    res.send(result);
});

router.use('/:coachingRegisterId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {employeeId, coachingRegisterId} = req.params as unknown as {employeeId: string, coachingRegisterId: string};
    const coachingRegister = await CoachingRegistersService.config(config, user, account.id)
        .findById(employeeId, coachingRegisterId);

    res.locals.object = coachingRegister;
    next();
});

router.get('/:coachingRegisterId', can('detail', 'CoachingRegister'), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, coachingRegisterId} = req.params;

    const result = await CoachingRegistersService.config(config, user, account)
        .findById(employeeId, coachingRegisterId);

    res.send(result);
});

router.put('/:coachingRegisterId', can('update', 'CoachingRegister'), validation(UpdateCoachingRegisterSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, coachingRegisterId} = req.params;

    const result = await CoachingRegistersService.config(config, user, account)
        .update(employeeId, coachingRegisterId, req.body);

    res.send(result);
});

router.put('/:coachingRegisterId/read', can('update', 'CoachingRegister', 'read'), validation(SetReadSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, coachingRegisterId} = req.params;

    await CoachingRegistersService.config(config, user, account)
        .setRead(employeeId, coachingRegisterId);

    res.sendStatus(204);
});

router.use('/:coachingRegisterId/todos', todosRouter);
