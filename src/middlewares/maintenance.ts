import {ForbiddenError} from '../modules/errors/errors';
import {ExpressMiddleware} from './middlewares.types';

const maintenance: ExpressMiddleware = async () => {
    throw new ForbiddenError();
};

export default maintenance;
