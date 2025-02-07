import {Request} from 'express';
import serverless, {Handler} from 'serverless-http';

import expressApp from '../../../app';
// eslint-disable-next-line import/order
import router from './router';
import config from '../../../config';
import {ErrorsNotification} from '../../../modules/errors/errors';

const app = expressApp((_app) => {
    _app.use('/', router);
});
const serverlessHandler = serverless(app, {
    basePath: '/app/oauth',

    // https://forum.serverless.com/t/solved-access-requestcontext-from-express-route-with-serverless-http-and-serverless-offline/5880
    request: function (req: Request, event: any) {
        if (event.requestContext.authorizer) {
            req.authorizer = event.requestContext.authorizer;
        }
    },
});

export const handler: Handler = async (event, context) => {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    const response: ResponseObject = await serverlessHandler(event, context);

    if (config.debug) {
        console.log(JSON.stringify({response}, null, 2));
    }

    if (!!response.statusCode && response.statusCode >= 500) {
        await ErrorsNotification.publish(context);
    }

    return response;
};

interface ResponseObject extends Object {
    statusCode?: number
}
