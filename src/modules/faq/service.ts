import {BarueriConfig} from 'config';
import orderBy from 'lodash/orderBy';
import {NotFoundError} from 'modules/errors/errors';

import FaqRepository from './repository';
import {Faq} from './schema';

export default class FaqService {
    static config(cfg: BarueriConfig, user: string): FaqService {
        return new FaqService(
            FaqRepository.config(cfg, user),
            user,
        );
    }

    async create(props: Faq) {
        return await this.repository.create({
            ...props,
            disabled: false,
        });
    }

    async list() {
        const list = await this.repository.list();
        return orderBy(list, ['created_at']);
    }

    async update(id: string, props: Partial<Faq>) {
        const data = (await this._retrieve(id)) as Faq;

        const updated = await this.repository.update(data, props);

        return updated;
    }

    async retrieve(id: string) {
        return await this._retrieve(id);
    }

    async delete(id: string) {
        const faq = (await this._retrieve(id)) as Faq;

        await this.repository.delete(faq);
    }

    private async _retrieve(id: string) {
        const faq = await this.repository.retrieve(id);
        if (!faq) {
            throw new NotFoundError('Faq not found');
        }
        return faq;
    }

    constructor(
        private repository: FaqRepository,
        private user: string,
    ) {}
}
