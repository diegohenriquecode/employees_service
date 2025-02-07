import {BarueriConfig} from 'config';
import {ConflictError, NotFoundError} from 'modules/errors/errors';
import {AppUser} from 'modules/users/schema';

import TrainingTopicsRepository from './repository';
import {CreateTrainingTopicProps, UpdateTrainingTopicProps} from './schema';

export default class TrainingTopicsService {
    static config(cfg: BarueriConfig, user: AppUser, accountId: string, trainingId: string): TrainingTopicsService {
        return new TrainingTopicsService(
            TrainingTopicsRepository.config(cfg, user, accountId, trainingId),
        );
    }

    async create(props: CreateTrainingTopicProps) {
        return await this.repository.create({...props, content: null});
    }

    async retrieve(id: string) {
        const training = await this.repository.retrieve(id);
        if (!training) {
            throw new NotFoundError('Topic not found');
        }

        return training;
    }

    async update(id: string, props: UpdateTrainingTopicProps) {
        const current = await this.retrieve(id);

        if (props.content && current.content && props.content !== current.content) {
            throw new ConflictError('Already has content');
        }

        return await this.repository.update(current, props);
    }

    async delete(id: string) {
        await this.repository.delete(id);
    }

    async listByTraining() {
        return await this.repository.listByTraining();
    }

    constructor(
        private repository: TrainingTopicsRepository,
    ) {}
}
