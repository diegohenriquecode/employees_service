import {Account} from 'modules/accounts/schema';
import {User} from 'modules/users/schema';
import OAuth2Server from 'oauth2-server';

export type AuthorizerContext = {
    account?: Account,
    rules?: any,
    token?: OAuth2Server.Token,
    user?: User,
};
