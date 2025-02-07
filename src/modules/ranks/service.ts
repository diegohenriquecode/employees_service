import {BarueriConfig} from 'config';
import orderBy from 'lodash/orderBy';
import {BadRequestError, ConflictError, NotFoundError} from 'modules/errors/errors';
import UsersRepository from 'modules/users/repository';
import {User} from 'modules/users/schema';

import RanksRepository from './repository';
import {RankProps} from './schema';

export default class RanksService {

    static config(cfg: BarueriConfig, user: User, account: string): RanksService {
        return new RanksService(
            RanksRepository.config(cfg, user.id, account),
            UsersRepository.config(cfg, user.id, account),
            account,
        );
    }

    async create(props: Pick<RankProps, 'title' | 'description' | 'responsibilities' | 'requirements' | 'desired' | 'hierarchical_level'>) {
        const byTitle = await this.findByTitle(props.title);

        if (byTitle) {
            throw new ConflictError();
        }

        return await this.repository.create({...props, disabled: false});
    }

    async list() {
        const list = await this.repository.listByAccount();

        return orderBy(list, ['title'], ['asc']);
    }

    async retrieve(id: string) {
        const account = await this.repository.retrieve(id);

        if (!account) {
            throw new NotFoundError('Rank not found');
        }

        return account;
    }

    async update(id: string, props: Pick<RankProps, 'title' | 'description' | 'responsibilities' | 'requirements' | 'desired' | 'hierarchical_level'>) {
        const currentRank = await this.retrieve(id);

        if (
            props.title &&
            (props.title !== currentRank.title)
        ) {
            const byTitle = await this.findByTitle(props.title);
            if (byTitle) {
                throw new ConflictError();
            }
        }

        return await this.repository.update(currentRank, props);
    }

    async setDisabled(id: string, value: boolean) {
        if (value === true) {
            const users = await this.users.list(
                {
                    '$and': [
                        {'account': {'$eq': this.account}},
                        {'rank': {'$eq': id}},
                        {'disabled': {'$ne': true}},
                    ],
                });
            if (users.length > 0) {
                throw new BadRequestError('Cannot disable ranks with associated users');
            }
        }

        await this.repository
            .patch(id, 'disabled', value);
    }

    private async findByTitle(title: string) {
        return await this.repository.findByTitle(title);
    }

    constructor(
        private repository: RanksRepository,
        private users: UsersRepository,
        private account: string,
    ) {}
}
