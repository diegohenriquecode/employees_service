import {InternalError} from 'modules/errors/errors';

import {ExpressParamCallback} from './middlewares.types';

const me: ExpressParamCallback = (req, res, next, val, param) => {
    const userId = res.locals.oauth.token.user.id;

    if (!userId) {
        throw new InternalError('User id not set');
    }

    if (val === 'me') {
        req.params[param] = userId;
    }

    next();
};

export default me;
