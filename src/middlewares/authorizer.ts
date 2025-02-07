import SessionsReportsService from 'modules/sessions-reports/service';
import {AppUser} from 'modules/users/schema';

import config from '../config';
import {NotFoundError} from '../modules/errors/errors';
import RolesService from '../modules/roles/service';
import {ExpressMiddleware} from './middlewares.types';

function getRoles(user: AppUser) {
    const roles = [user.roles];
    if (Object.keys(user.sectors).map(s => user.sectors[s]).some(s => s.is_manager)) {
        roles.push('manager');
    }

    return roles;
}

const authorizer: ExpressMiddleware = async (req, res, next) => {
    const {account} = res.locals;

    const token = JSON.parse(req.authorizer.token);
    const rules = JSON.parse(req.authorizer.rules);
    const user = JSON.parse(req.authorizer.user);
    if (user.disabled) {
        throw new NotFoundError('User disabled');
    }
    user.ability = RolesService.config(config, user, account)
        .userAbility(user, rules);
    user.rolesArray = getRoles(user);

    Object.assign(res.locals, {oauth: {token}, user, rules});

    /**
     * Registra Sessão
     */
    await SessionsReportsService.config(config, user).create();

    next();
};

export default authorizer;
