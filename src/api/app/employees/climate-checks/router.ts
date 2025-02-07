import express from 'express';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import ClimateChecksService from '../../../../modules/climate-checks/service';
import {ClimateCheckResponse} from './schema';

const router = express.Router();
export default router;

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const result = await ClimateChecksService.config(config, account, user)
        .hasPending();

    res.send(result);
});

router.post('/', validation(ClimateCheckResponse), async (req, res) => {
    const {account, user} = res.locals;

    const {sector, ...body} = req.body;

    await ClimateChecksService.config(config, account, user)
        .submit(body, sector || user.sector);

    res.sendStatus(204);
});
