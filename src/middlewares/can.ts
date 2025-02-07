import RolesService, {PermissionAction, subjects} from 'modules/roles/service';

import {ForbiddenError} from '../modules/errors/errors';
import {ExpressMiddleware} from './middlewares.types';

function can(action: PermissionAction, resource: typeof subjects[number], field?: string): ExpressMiddleware {
    return async (req, res, next) => {
        const {user, object} = res.locals;

        if (object && !(await user.ability.can(action, RolesService.object(resource, object), field))) {
            throw new ForbiddenError();
        }
        if (!object && !(await user.ability.can(action, resource, field))) {
            throw new ForbiddenError();
        }

        next();
    };
}

export default can;
