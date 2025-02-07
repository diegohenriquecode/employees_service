import {CustomAuthorizerResult, Context, APIGatewayRequestAuthorizerEvent} from 'aws-lambda';
import {NotFoundError} from 'modules/errors/errors';

import config from '../config';
import {AuthorizerContext} from './schemas';
import {AuthUtils} from './utils';

export async function handler(event: APIGatewayRequestAuthorizerEvent, context: Context): Promise<CustomAuthorizerResult> {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    const Effect = 'Allow';

    let responseContext: AuthorizerContext = {};
    try {
        responseContext = await _handler(event);
    } catch (error) {
        if (!(error instanceof NotFoundError)) {
            console.error('error', error);
            throw new Error('Unauthorized');
        }
    }

    const response = {
        context: AuthUtils.outputContext(responseContext),
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect,
                    Resource: '*',
                },
            ],
        },
        principalId: 'public',
    };

    if (config.debug) {
        console.log(JSON.stringify({response}, null, 2));
    }

    return response;
}

async function _handler(event: APIGatewayRequestAuthorizerEvent): Promise<AuthorizerContext> {
    const origin = event.headers?.Origin || event.headers?.origin;
    const account = await AuthUtils.getAccount(origin);

    return {account};
}
