import express from 'express';
import uniqBy from 'lodash/uniqBy';
import UsersService from 'modules/users/service';

import config from '../../../config';

const router = express.Router();
export default router;

router.get('/', async (req, res) => {
    const {account, user} = res.locals;
    let result = await UsersService.config(config, user, account.id)
        .listManagers();

    result = uniqBy(result.map(list), e => e.id);
    res.send(result);
});

function list(user: any) {
    if (!user) {
        return user;
    }
    const {id, name, sector, rank, disabled, avatarUrl, hired_at} = user;
    return {id, name, sector, rank, disabled, avatarUrl, hired_at};
}
