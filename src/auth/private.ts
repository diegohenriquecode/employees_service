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

    let Effect = 'Allow';

    let responseContext: AuthorizerContext = {};
    try {
        responseContext = await _handler(event);
    } catch (error) {
        if (error instanceof NotFoundError) {
            Effect = 'Deny';
        } else {
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
        principalId: responseContext.user?.id || 'public',
    };

    if (config.debug) {
        console.log(JSON.stringify({response}, null, 2));
    }

    return response;
}

async function _handler(event: APIGatewayRequestAuthorizerEvent): Promise<AuthorizerContext> {
    const origin = event.headers?.Origin || event.headers?.origin;
    const account = await AuthUtils.getAccount(origin);

    const token = await AuthUtils.authenticate(account.id, event);
    const user = await AuthUtils.getUser(account.id, token.user.id);
    const rules = await AuthUtils.rules(account, user);

    const responseContext: AuthorizerContext = {account, rules, token, user};

    return responseContext;
}
