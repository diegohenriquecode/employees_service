import express from 'express';
import validation from 'middlewares/validation';

import config from '../../../../config';
import {PendingActionsListArgs, PendingActionsListSchemaMap} from '../../../../modules/pending-actions/schema';
import PendingActionsService from '../../../../modules/pending-actions/service';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', validation(PendingActionsListSchemaMap, 'query'), async (req, res) => {
    const {account_id: account, user} = res.locals;
    const {employeeId} = req.params;
    const query = req.query as unknown as PendingActionsListArgs;
    const service = PendingActionsService.config(config, user.id, account);

    const result = query.history
        ? await service.list(account, employeeId, query)
        : await service.listByEmployee(account, employeeId, query);
    res.send(result);
});
