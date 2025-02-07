import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {ClausesType} from 'modules/feedbacks/schema';
import ReprimandsService from 'modules/reprimands/service';

import {
    ReprimandListArgs,
    ReprimandListArgsSchema,
} from './schema';

const router = express.Router();
export default router;

router.get('/', validation(ReprimandListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as ReprimandListArgs;

    const mongoQuery = user.ability
        .mongoQuery('Reprimand', 'list');

    if (query.format === 'xlsx') {
        const result = await ReprimandsService.config(config, user, account)
            .generateAsyncReport(query, mongoQuery as ClausesType);
        res.status(202).send(result);
    } else {
        const result = await ReprimandsService.config(config, user, account)
            .list({
                ...query,
                pageSize: query.format === 'summary' ? Number.MAX_SAFE_INTEGER : query.pageSize,
            }, mongoQuery as ClausesType);

        res.send(query.format === 'summary' ? result.items : result);
    }

});
