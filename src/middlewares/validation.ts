import {Schema} from 'joi';

import {InternalError, ValidationError} from '../modules/errors/errors';
import {ExpressMiddleware} from './middlewares.types';

export const ALLOWED_FIELDS = {
    params: 'params',
    body: 'body',
    query: 'query',
    headers: 'headers',
} as const;
type Field = typeof ALLOWED_FIELDS[keyof typeof ALLOWED_FIELDS];

const validation = (schema: Schema, field: Field = 'body', {fatal = false} = {}): ExpressMiddleware => {
    return (req, res, next) => {
        const expressField = field as keyof typeof ALLOWED_FIELDS;

        const result = schema.validate(req[expressField], {abortEarly: false, presence: 'required'});
        if (result.error) {
            const details = result.error.details.map(d => d.message);

            if (fatal) {
                throw new InternalError(details.join(','));
            } else {
                throw new ValidationError('Validation error', details);
            }
        }
        req[expressField] = result.value ?? req[expressField];
        next();
    };
};

export default validation;
