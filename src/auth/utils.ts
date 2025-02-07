import {APIGatewayAuthorizerResultContext, APIGatewayRequestAuthorizerEvent} from 'aws-lambda';
import Joi from 'joi';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {NotFoundError} from 'modules/errors/errors';
import ModelBuilder from 'modules/oauth/model';
import RolesService from 'modules/roles/service';
import UsersRepository from 'modules/users/repository';
import {AppUser, User} from 'modules/users/schema';
import OAuth2Server from 'oauth2-server';

import config from '../config';
import {AuthorizerContext} from './schemas';

export class AuthUtils {
    static authenticate(account: string, event: APIGatewayRequestAuthorizerEvent) {
        const oauth = new OAuth2Server({
            model: ModelBuilder(account),
        });
        return oauth.authenticate(
            new OAuth2Server.Request({
                method: event.httpMethod,
                query: event.queryStringParameters || {},
                headers: event.headers,
            }),
            new OAuth2Server.Response({
                headers: {},
            }),
        );
    }

    static async getAccount(origin: string | undefined) {
        let subdomain = '';

        if (origin) {
            const {hostname} = new URL(origin as string);
            const validIp = !ipSchema.validate(hostname).error;

            subdomain = hostname.split('.')[0];

            if ((subdomain === 'api' || hostname === 'localhost' || validIp) && config.fallbackSubdomain) {
                subdomain = config.fallbackSubdomain;
            }
        }

        const account = await AccountsService.config(config, 'account-middleware')
            .findBySubdomain(subdomain);
        if (!account) {
            throw new NotFoundError('Account not found');
        }
        if (account.disabled) {
            throw new NotFoundError('Account disabled');
        }
        return account;
    }

    static async getUser(account_id: string, user_id: string) {
        const user = await UsersRepository.config(config, user_id, account_id)
            .retrieve(user_id);
        if (!user) {
            throw new NotFoundError();
        }
        return user as AppUser;
    }

    static outputContext(context: AuthorizerContext) {
        return Object.keys(context)
            .reduce((a, b) => {
                a[b] = JSON.stringify(context[b as keyof AuthorizerContext]);
                return a;
            }, {} as APIGatewayAuthorizerResultContext);
    }

    static rules(account: Account, user: User) {
        return RolesService.config(config, user as AppUser, account)
            .rules(user as AppUser);
    }
}

const ipSchema = Joi.string().ip();
