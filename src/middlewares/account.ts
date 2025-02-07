
import {NotFoundError} from 'modules/errors/errors';

import {ExpressMiddleware} from './middlewares.types';

const accountMiddleware: ExpressMiddleware = async (req, res, next) => {
    const account = req.authorizer.account && JSON.parse(req.authorizer.account);
    if (!account) {
        throw new NotFoundError('Account not found');
    }
    if (account.disabled) {
        throw new NotFoundError('Account disabled');
    }

    Object.assign(res.locals, {account, account_id: account.id});
    next();
};

export default accountMiddleware;
