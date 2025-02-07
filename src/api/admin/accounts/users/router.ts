import config from 'config';
import express from 'express';
import omit from 'lodash/omit';
import AccountsService from 'modules/accounts/service';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

const router = express.Router({mergeParams: true});
export default router;

router.get('/count', async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {accountId} = req.params;

    await AccountsService.config(config, '')
        .retrieve(accountId);

    const result = await UsersService.config(config, {id: userId} as User, accountId)
        .countDisabled();

    res.send({
        active: result.created - result.disabled,
        created: result.created,
    });
});

router.get('/:userId', async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {userId, accountId} = req.params as {userId: string, accountId: string};

    const result = await UsersService.config(config, {id: user.id} as User, accountId)
        .retrieve(userId);

    res.send(userDetails(result));
});

function userDetails(user: Partial<User>) {
    if (!user) {
        return user;
    }
    return {
        ...omit(user, [
            'birthday',
            'effectivated_at',
            'effective',
            'dismissed_at',
            'hired_at',
            'register',
            'avatar_key',
            'manager_of',
            'sector',
        ]),
        account: undefined,
        client_id: undefined,
    };
}
