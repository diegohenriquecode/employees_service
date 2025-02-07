import {ErrorRequestHandler} from 'express';

import {BarueriError, ServerError} from '../modules/errors/errors';

export default function exceptions(debug = false): ErrorRequestHandler {
    return async (err, req, res, _next) => {
        let error;
        try {
            error = err instanceof BarueriError
                ? err
                : ServerError.fromError(err);

            if (debug || error instanceof ServerError) {
                console.error(error);
            }
        } catch (e) {
            console.error((e as Error).message);
            console.error((e as Error).stack);
            error = ServerError.fromError(e);
        } finally {
            res
                .status((error as BarueriError).status)
                .send((error as BarueriError).toJSON());
        }
    };
}
