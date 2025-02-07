import {BarueriConfig} from 'config';

import ConfigurationRepository from './repository';
import {Configuration} from './schema';

export default class ConfigurationService {
    static config(cfg: BarueriConfig, user: string, accountId: string): ConfigurationService {
        return new ConfigurationService(
            ConfigurationRepository.config(cfg, user, accountId),
            user,
            accountId,
        );
    }

    async create(props: Configuration) {
        return await this.repository.create({
            ...props,
            account: this.accountId,
        });

    }

    async retrieve() {
        const retrieve = await this.repository.retrieve();

        return retrieve;
    }

    async update(props: Partial<Configuration>) {
        const data = (await this.retrieve()) as Configuration;

        const updated = await this.repository.update(data, props);

        return updated;
    }

    constructor(
        private repository: ConfigurationRepository,
        private user: string,
        private accountId: string,
    ) {}
}
