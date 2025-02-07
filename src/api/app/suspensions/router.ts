import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {ClausesType} from 'modules/feedbacks/schema';
import SuspensionsService from 'modules/suspensions/service';

import {
    SuspensionListArgs,
    SuspensionListArgsSchema,
} from './schema';

const router = express.Router();
export default router;

router.get('/', validation(SuspensionListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as SuspensionListArgs;

    const mongoQuery = user.ability
        .mongoQuery('Suspension', 'list');

    if (query.format === 'xlsx') {
        const result = await SuspensionsService.config(config, user, account)
            .generateAsyncReport(query, mongoQuery as ClausesType);
        res.status(202).send(result);
    } else if (query.format === 'json') {
        const result = await SuspensionsService.config(config, user, account)
            .list(query, mongoQuery as ClausesType);
        res.send(result);
    } else { // summary
        const {items: result} = await SuspensionsService.config(config, user, account)
            .list({...query, pageSize: Number.MAX_SAFE_INTEGER}, mongoQuery as ClausesType);
        res.send(result);
    }
});
