import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import ChangesHistoryRepository from 'modules/changes-history/repository';

import {ListChangesHistoryQuery, ListChangesHistoryQuerySchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', validation(ListChangesHistoryQuerySchema, 'query'), async (req, res) => {
    const {accountId, from, to, entity, entity_id} = req.query as unknown as ListChangesHistoryQuery;

    const result = await ChangesHistoryRepository.config(config, 'change-history', accountId)
        .list({from, to, entity, entity_id});

    res.send(result);
});
