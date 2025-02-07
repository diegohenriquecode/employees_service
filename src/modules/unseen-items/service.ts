import {BarueriConfig} from 'config';

import UnseenItemsRepository from './repository';

export default class UnseenItemsService {

    static config(cfg: BarueriConfig, user: string): UnseenItemsService {
        return new UnseenItemsService(
            UnseenItemsRepository.config(cfg, user),
        );
    }

    async countByEmployeeAndFeature(account: string, employee: string, id: string) {
        const currentItem = await this.retrieve(account, employee, id);

        return currentItem.count;
    }

    async increment(account: string, employee: string, id: string) {
        const currentItem = await this.retrieve(account, employee, id);

        await this.repository.update(currentItem, {
            count: currentItem.count + 1,
        });
    }

    async readAll(account: string, employee: string, id: string) {
        const currentItem = await this.retrieve(account, employee, id);

        await this.repository.update(currentItem, {
            count: 0,
        });
    }

    async retrieve(account: string, employee: string, id: string) {
        let currentItem = await this.repository.retrieve(account, employee, id);

        if (!currentItem) {
            currentItem = await this.repository.create({
                employee,
                id,
                count: 0,
                account,
            });
        }

        return currentItem;
    }

    constructor(
        private repository: UnseenItemsRepository,
    ) {}
}
