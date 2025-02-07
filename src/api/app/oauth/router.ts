import config from 'config';
import express from 'express';
import OAuthServer from 'express-oauth-server';
import validation from 'middlewares/validation';
import {UnprocessableEntity} from 'modules/errors/errors';
import UsersService from 'modules/users/service';

import accountMiddleware from '../../../middlewares/account';
import ModelBuilder from '../../../modules/oauth/model';
import {UpdatePasswordSchema} from './schema';

const router = express.Router();
export default router;

router.use(accountMiddleware);

router.put('/password', validation(UpdatePasswordSchema), async (req, res) => {
    const {account} = res.locals;

    const {username, old_password, new_password} = req.body;

    await UsersService.config(config, 'change-password', account.id)
        .updatePasswordByUsername(username, old_password, new_password);

    res.sendStatus(204);
});

router.post('/token', async (req, res, next) => {
    const {username, password} = req.body;

    const user = await UsersService.config(config, 'change-password', res.locals.account_id)
        .findVerified(username, password);

    if (user?.change_password) {
        throw new UnprocessableEntity('Change password');
    }

    return new OAuthServer({model: ModelBuilder(res.locals.account_id)})
        .token({requireClientAuthentication: {password: false}})(req, res, next);
},
);
