import {ForbiddenError} from '../modules/errors/errors';
import decode from '../modules/roles/decoder';
import {ExpressMiddleware} from './middlewares.types';

const permission: ExpressMiddleware = async (req, res, next) => {
    const {user} = res.locals;

    if (byPass.every(bps => !req.path.includes(bps))) {
        const {action = 'manage', object = 'all', field} = decode(req.method, req.path);

        const allowed = await user.ability
            .can(action, object, field);
        if (!allowed) {
            console.warn(user, 'cannot', action, 'on', object, field);
            throw new ForbiddenError();
        }
    }

    next();
};

export default permission;

const byPass = ['evaluations', 'feedbacks', 'dismiss-interviews', 'suspensions', 'reprimands', 'coaching-registers', 'training-trails', 'climate-checks', 'comments'];
