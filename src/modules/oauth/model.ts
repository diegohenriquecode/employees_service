import moment from 'moment';
import {PasswordModel} from 'oauth2-server';

import config from '../../config';
import TokensRepository from '../tokens/repository';
import {User} from '../users/schema';
import UsersService from '../users/service';

export default function ModelBuilder(account: string): PasswordModel {
    const users = UsersService.config(config, {id: 'oauth'} as User, account);
    return {
        async getAccessToken(bearerToken) {
            const token = await tokens.retrieve(bearerToken);
            if (!token) {
                return false;
            }
            if (token.account_id !== account) {
                return false;
            }

            return convertedToken(token);
        },
        async saveToken(token, client, user) {
            const result = await tokens.create({
                id: token.accessToken,
                type: 'Bearer',
                scope: Array.isArray(token.scope) ? token.scope.join(' ') : token.scope,
                revoked: false,
                expires_in: 864000, // ignoring `token.accessTokenExpiresAt`
                client_id: client.id,
                user_id: user.id,
                user_roles: user.roles,
                account_id: account,
            });
            return convertedToken(result);
        },
        async verifyScope(token, scope) {
            if (!token.scope) {
                return false;
            }
            const requestedScopes = Array.isArray(scope) ? scope : scope.split(' ');
            const authorizedScopes = Array.isArray(token.scope) ? token.scope : token.scope.split(' ');
            return requestedScopes
                .every(s => authorizedScopes.indexOf(s) >= 0);
        },
        async getClient(clientId, _clientSecret) {
            if (clientId !== config.appClientId) {
                return false;
            }
            return {
                id: config.appClientId,
                grants: ['password'],
            };
        },
        async getUser(username, _password) {
            const user = await users.findVerified(username, _password);
            if (user) {
                return user;
            }
            return false;
        },
    };
}

const tokens = TokensRepository.config(config, 'oauth');

function convertedToken(token: any) {
    return {
        accessToken: token.id,
        accessTokenExpiresAt: moment(token.created_at).add(token.expires_in, 's').toDate(),
        scope: token.scope,
        client: {
            id: token.client_id,
            grants: [],
        },
        user: {
            id: token.user_id,
            roles: token.user_roles,
        },
    };
}
