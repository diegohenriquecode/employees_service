import AdminsService from 'modules/admins/service';

import config from '../config';
import {NotFoundError, UnauthorizedError} from '../modules/errors/errors';
import TokensService from '../modules/tokens/service';
import {ExpressMiddleware} from './middlewares.types';

const adminAuth: ExpressMiddleware = async (req, res, next) => {
    const authorizationToken = req.header('authorization');
    if (!authorizationToken || !authorizationToken.startsWith('Bearer ')) {
        throw new UnauthorizedError();
    }

    const tokenId = authorizationToken.split(' ')[1];
    try {
        const tokens = TokensService.config(config, 'authorizer');
        const token = await tokens.retrieveValid(tokenId);
        const user = await AdminsService.config(config, 'authorizer')
            .retrieve(token.user_id);

        if (user.disabled) {
            throw new NotFoundError('User disabled');
        }

        res.locals.oauth = {
            token: {...token, user: {id: token.user_id, permissions: user.permissions}},
        };
    } catch (e) {
        console.error(e);
        throw new UnauthorizedError();
    }
    next();
};

export default adminAuth;
