import {ExpressMiddleware} from './middlewares.types';

const withoutCSP: ExpressMiddleware = (req, res, next) => {
    res.removeHeader('content-security-policy');
    next();
};

export default withoutCSP;
