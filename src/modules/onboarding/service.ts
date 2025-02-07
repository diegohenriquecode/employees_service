import {BarueriConfig} from 'config';
import {Account} from 'modules/accounts/schema';
import {User} from 'modules/users/schema';

import OnboardingRepository from './repository';
import {OnboardingUpdate} from './schema';

export default class OnboardingService {
    static config(cfg: BarueriConfig, user: User, account: Account): OnboardingService {
        return new OnboardingService(
            OnboardingRepository.config(cfg, user.id, account.id),
        );
    }

    async create() {
        return await this.repository.create();
    }

    async update(onboardingUpdate: OnboardingUpdate) {
        const current = await this.repository.retrieve();

        const updated = {
            ...current,
            features: {
                ...current.features,
                ...onboardingUpdate,
            },
        };

        return await this.repository.update(current, updated);
    }

    async retrieve() {
        return this.repository.retrieve();
    }

    constructor(
        private repository: OnboardingRepository,
    ) {}
}
