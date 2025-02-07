import express from 'express';

import adminAuth from '../../middlewares/admin-auth';
import {Account} from '../../modules/accounts/schema';
import trainings from '../app/trainings/router';
import accounts from './accounts/router';
import auth from './auth/router';
import faq from './faq/router';
import notes from './notes/router';
import tutorials from './tutorials/router';
import users from './users/router';

const router = express.Router();
export default router;

router.use('/auth', auth);

router.use(adminAuth);

router.use('/accounts', accounts);

router.use('/notes', notes);
router.use('/faq', faq);
router.use('/videos', tutorials);
router.use('/trainings', fakeAccountAndUser, trainings);
router.use('/users', users);

function fakeAccountAndUser(req: express.Request, res: express.Response, next: express.NextFunction) {
    const account = {id: 'backoffice'} as Account;
    Object.assign(res.locals, {account_id: account.id, account});
    res.locals.user = {
        ...res.locals.oauth.token.user,
        ability: {
            cannot() {
                return false;
            },
            can() {
                return true;
            },
        },
    };
    next();
}
