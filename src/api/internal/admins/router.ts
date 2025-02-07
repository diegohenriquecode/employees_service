import express from 'express';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import AdminsService from '../../../modules/admins/service';
import {CreateAdminSchema} from './schema';

const router = express.Router();
export default router;

router.get('/', async (req, res) => {
    const result = await admins.list();

    res.send(result);
});

router.post('/', validation(CreateAdminSchema), async (req, res) => {
    const result = await admins
        .create(req.body);

    res.send(result);
});

const admins = AdminsService.config(config, 'internal');
