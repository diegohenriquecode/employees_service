import config from 'config';
import express from 'express';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

import account from '../../../middlewares/account';

const router = express.Router();
export default router;

router.use(account);

router.get('/me', async (req, res) => {
    const {account: {id, name, subdomain, max_users, logoUrl, modules}} = res.locals;

    const result = {
        id,
        name,
        logo: logoUrl || `${config.mailAssetsUrl}/default-logo.png`,
        subdomain,
        hasReachedMaxActiveUsers: undefined,
        modules,
    };

    if (max_users) {
        const count = await UsersService.config(config, {id: 'public'} as User, id)
            .countDisabled();

        const active = count.created - count.disabled;
        result.hasReachedMaxActiveUsers = active >= max_users;
    }

    res.send(result);
});
