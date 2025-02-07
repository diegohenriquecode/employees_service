import express from 'express';
import validation from 'middlewares/validation';
import CoachingRegistersService from 'modules/coaching-registers/service';

import config from '../../../../../config';
import {CreateCoachingRegisterTodoSchema, UpdateCoachingRegisterTodoSchema, CompleteCoachingRegisterTodoSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.post('/', validation(CreateCoachingRegisterTodoSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, coachingRegisterId} = req.params;

    const result = await CoachingRegistersService.config(config, user, account)
        .addTodo(employeeId, coachingRegisterId, req.body);

    res.send(result);
});

router.patch('/:todoId', validation(UpdateCoachingRegisterTodoSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, coachingRegisterId, todoId} = req.params;

    const result = await CoachingRegistersService.config(config, user, account)
        .updateTodo(employeeId, coachingRegisterId, todoId, req.body);

    res.send(result);
});

router.put('/:todoId/completed_at', validation(CompleteCoachingRegisterTodoSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, coachingRegisterId, todoId} = req.params;

    const result = await CoachingRegistersService.config(config, user, account)
        .completeTodo(employeeId, coachingRegisterId, todoId, req.body);

    res.send(result);
});

router.delete('/:todoId', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {employeeId, coachingRegisterId, todoId} = req.params;

    const result = await CoachingRegistersService.config(config, user, account)
        .deleteTodo(employeeId, coachingRegisterId, todoId);

    res.send(result);
});
