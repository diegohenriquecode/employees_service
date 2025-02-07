import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import CoachingRegistersService from 'modules/coaching-registers/service';
import {ClausesType} from 'modules/feedbacks/schema';

import {CoachingRegistersListArgs, CoachingRegistersListArgsSchema} from './schema';

const router = express.Router();
export default router;

router.get('/', validation(CoachingRegistersListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as CoachingRegistersListArgs;
    const {sector, from, to} = query;

    const mongoQuery = user.ability
        .mongoQuery('CoachingRegister', 'list');

    if (query.format === 'summary') {
        const report = await CoachingRegistersService.config(config, user, account.id)
            .report(sector as string, from, to);

        res.send(report);
    } else if (query.format === 'xlsx') {
        const result = await CoachingRegistersService.config(config, user, account.id)
            .generateAsyncReport(query, mongoQuery);

        res.status(202).send(result);
    } else {
        const result = await CoachingRegistersService.config(config, user, account.id)
            .list(query, mongoQuery as ClausesType);

        res.send(result);
    }
});
