import express from 'express';
import validation from 'middlewares/validation';
import {ForbiddenError} from 'modules/errors/errors';
import RolesService from 'modules/roles/service';

import config from '../../../../config';
import TimelinesService from '../../../../modules/timelines/service';
import {QueryTimelines, QueryTimelinesSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', validation(QueryTimelinesSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const query = req.query as unknown as QueryTimelines;

    const resource = RolesService.object('Timeline', {
        employee: req.params.employeeId,
        sector: user.sector,
        type: query.type,
    });

    const can = await user.ability
        .can('list', resource);
    if (!can) {
        throw new ForbiddenError();
    }

    const result = await TimelinesService.config(config, user.id)
        .list(account.id, employeeId, query);

    res.send(result);
});
