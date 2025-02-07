import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {ConfigurationSchema} from 'modules/configuration/schema';
import ConfigurationService from 'modules/configuration/service';

const router = express.Router();

router.post('/', validation(ConfigurationSchema), async (req, res) => {
    const {account, user} = res.locals;

    const data = await ConfigurationService.config(config, user.id, account.id)
        .create(req.body);

    res.send(data);
});

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const data = await ConfigurationService.config(config, user.id, account.id)
        .retrieve();

    res.send(data);
});

router.patch('/', async (req, res) => {
    const {account, user} = res.locals;

    const data = await ConfigurationService.config(config, user.id, account.id)
        .update(req.body);

    res.send(data);
});

export default router;
