import {PermissionTypes} from 'modules/admins/schema';

import {ForbiddenError} from '../modules/errors/errors';
import {ExpressMiddleware} from './middlewares.types';

function adminCan(resource: string, action?: string): ExpressMiddleware {
    return (req, res, next) => {
        const user = res.locals.oauth.token.user;

        const hasManage = user.permissions && user.permissions[resource]?.includes(PermissionTypes.manage);

        if (!hasManage && (!user.permissions || !user.permissions[resource]?.includes(action))) {
            throw new ForbiddenError();
        }

        next();
    };
}

export default adminCan;
