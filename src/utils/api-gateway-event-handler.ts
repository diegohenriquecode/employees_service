import {
    APIGatewayProxyEvent,
    APIGatewayProxyHandler,
    APIGatewayProxyResult,
} from 'aws-lambda/trigger/api-gateway-proxy';
import {Express, Request} from 'express';
import serverless from 'serverless-http';

import config from '../config';
import {ErrorsNotification} from '../modules/errors/errors';

export default function apiGatewayEventHandler(basePath: string, app: Express): APIGatewayProxyHandler {
    const serverlessHandler = serverless(app, {
        basePath,
        // https://forum.serverless.com/t/solved-access-requestcontext-from-express-route-with-serverless-http-and-serverless-offline/5880
        request: function (req: Request, event: APIGatewayProxyEvent) {
            if (event.requestContext.authorizer) {
                req.authorizer = event.requestContext.authorizer;
            }
        },
    });

    return async (event, context) => {
        if (config.debug) {
            console.log(JSON.stringify({event}, null, 2));
            console.log(JSON.stringify({context}, null, 2));
        }

        const response = await serverlessHandler(event, context) as APIGatewayProxyResult;

        if (config.debug) {
            console.log(JSON.stringify({response}, null, 2));
        }

        if (!!response.statusCode && response.statusCode >= 500) {
            await ErrorsNotification.publish(context);
        }

        return response;
    };
}
