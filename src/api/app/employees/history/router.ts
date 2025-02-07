import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import UsersUpdateHistoryService from 'modules/users-update-history/service';

import {EmployeeUpdateHistoryQuery, EmployeeUpdateHistoryQuerySchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', validation(EmployeeUpdateHistoryQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const query = req.query as unknown as EmployeeUpdateHistoryQuery;

    const result = await UsersUpdateHistoryService.config(config, user, account)
        .list(employeeId, query);

    res.send(result);
});
