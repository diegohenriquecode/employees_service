import {BarueriConfig} from 'config';
import {UserProps} from 'modules/users/schema';
import moment from 'moment';

import AdminsService from '../admins/service';
import {NotFoundError, UnauthorizedError} from '../errors/errors';
import TokensRepository from './repository';

export default class TokensService {
    static config(cfg: BarueriConfig, user: string) {
        return new TokensService(
            TokensRepository.config(cfg, user),
            AdminsService.config(cfg, user),
        );
    }

    async issue(props: Pick<UserProps, 'username'|'password'|'scopes'|'client_id'>) {
        const {username, password, client_id} = props;

        const user = await this.admins.findVerified(username, password);
        if (!user) {
            throw new UnauthorizedError();
        }

        return this.repository.create({
            type: 'Bearer',
            revoked: false,
            expires_in: 864000,
            user_id: user.id,
            client_id,
        });
    }

    async retrieveValid(id: string) {
        const token = await this.repository.retrieve(id);
        if (!token) {
            throw new NotFoundError(`Token não encontrada: ${id}`);
        }
        if (token.revoked) {
            throw new UnauthorizedError(`Token revogada: ${id}`);
        }
        if (moment().isAfter(moment(token.created_at).add(token.expires_in, 'seconds'))) {
            throw new UnauthorizedError(`Token expirada: ${id}`);
        }
        return token;
    }

    constructor(
        private repository: TokensRepository,
        private admins: AdminsService,
    ) { }
}
