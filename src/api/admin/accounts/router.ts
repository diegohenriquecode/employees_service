import config from 'config';
import express from 'express';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

import commercials from './commercials/router';
import trainings from './trainings/router';

const router = express.Router();
export default router;

router.use('/commercials', commercials);
router.use('/trainings', trainings);

router.get('/', async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const result = await AccountsService.config(config, userId)
        .listAll();

    res.send(result.map(accountList));
});

router.get('/:accountId', async (req, res) => {
    const userId = res.locals.oauth.token.user.id;
    const {accountId} = req.params;

    const result = await AccountsService.config(config, userId)
        .findById(accountId);

    res.send(accountList(result as Account));
});

router.get('/:accountId/users/:userId', async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {userId, accountId} = req.params as {userId: string, accountId: string};

    const result = await UsersService.config(config, {id: user.id} as User, accountId)
        .retrieve(userId);

    res.send(userDetails(result));
});

function accountList(account: Account) {
    if (!account) {
        return account;
    }

    const {id, name, is_demo} = account;

    return {id, name, is_demo};
}

function userDetails(user: Partial<User>) {
    if (!user) {
        return user;
    }

    const {id, name} = user;
    return {id, name};
}
