import config from 'config';
import express from 'express';
import can from 'middlewares/can';
import validation from 'middlewares/validation';
import DismissInterviewsService from 'modules/dismiss-interviews/service';
import UsersService from 'modules/users/service';

import {
    ClausesType,
    DismissInterviewsListArgs,
    DismissInterviewsListArgsSchema,
} from './schema';

const router = express.Router();

export default router;

router.get('/', can('list', 'DismissInterview'), validation(DismissInterviewsListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as DismissInterviewsListArgs;

    const mongoQuery = user.ability
        .mongoQuery('DismissInterview', 'list');

    query.employees = await UsersService.config(config, user, account.id)
        .resolvedEmployees(query.employee ? [query.employee] : undefined, query.sector, query.deep, user, 'DismissInterview', true);

    if (query.format === 'xlsx') {
        const result = await DismissInterviewsService.config(config, user, account.id)
            .generateAsyncReport(query, mongoQuery);
        res.status(202).send(result);
    } else if (query.format === 'json') {
        const result = await DismissInterviewsService.config(config, user, account.id)
            .listReport(query, mongoQuery as ClausesType);
        res.send(result);
    } else {
        const result = await DismissInterviewsService.config(config, user, account.id)
            .list(query);
        res.send(result);
    }
});
