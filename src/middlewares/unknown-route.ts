import {NotFoundError} from '../modules/errors/errors';
import {ExpressMiddleware} from './middlewares.types';

const unknownRoute: ExpressMiddleware = (req, res, next) => {
    next(new NotFoundError('Rota não encontrada'));
};

export default unknownRoute;
