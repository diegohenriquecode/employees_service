import {ForbiddenError} from '../modules/errors/errors';
import {ExpressMiddleware} from './middlewares.types';

function apiKey(...valid: string[]): ExpressMiddleware {
    return (req, res, next) => {
        const apiKeyValue = req.header('x-api-key');
        if (!apiKeyValue || !valid.includes(apiKeyValue)) {
            throw new ForbiddenError();
        }
        next();
    };
}

export default apiKey;
