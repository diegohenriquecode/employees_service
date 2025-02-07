import {BarueriConfig} from 'config';
import {ConflictError, NotFoundError} from 'modules/errors/errors';
import TrainingsService from 'modules/trainings/service';
import {AppUser} from 'modules/users/schema';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import {TrainingTopic, TrainingTopicProps} from './schema';

export default class TrainingTopicsRepository {
    static config(cfg: BarueriConfig, user: AppUser, account: string, training: string) {
        return new TrainingTopicsRepository(
            training,
            TrainingsService.config(cfg, user, account),
            user,
        );
    }

    async create(props: Omit<TrainingTopicProps, 'account'>) {
        const topics = await this.listByTraining();

        const Item: TrainingTopic = {
            id: uuidV4(),
            ...props,
            created_at: moment().toISOString(),
            created_by: this.user.id,
            updated_at: moment().toISOString(),
            updated_by: this.user.id,
        };

        const topicIdx = topics.findIndex(t => t.id === Item.id);
        if (topicIdx >= 0) {
            throw new ConflictError('Key already exists');
        }

        topics.push(Item);

        await this.patchTraining(topics);

        return Item;
    }

    async update(current: TrainingTopic, patch: Partial<TrainingTopicProps>) {
        const topics = await this.listByTraining();
        const topicIdx = topics.findIndex(t => t.id === current.id);
        if (topicIdx < 0) {
            throw new NotFoundError('Topic not found');
        }

        const Item: TrainingTopic = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user.id,
        };

        topics[topicIdx] = Item;

        await this.patchTraining(topics);

        return Item;
    }

    async patch(id: string, fieldName: keyof TrainingTopicProps, fieldValue: any) {
        const topics = await this.listByTraining();
        const topicIdx = topics.findIndex(t => t.id === id);
        if (topicIdx < 0) {
            throw new NotFoundError('Topic not found');
        }

        topics[topicIdx][fieldName] = fieldValue;

        await this.patchTraining(topics);
    }

    async retrieve(id: string) {
        const topics = await this.listByTraining();
        return topics.find(t => t.id === id);
    }

    async delete(id: string) {
        const topics = await this.listByTraining();
        const topicIdx = topics.findIndex(t => t.id === id);
        if (topicIdx < 0) {
            throw new NotFoundError('Topic not found');
        }

        topics.splice(topicIdx, 1);

        await this.patchTraining(topics);
    }

    async listByTraining() {
        const {topics} = await this.retrieveTraining();
        return topics ?? [];
    }

    private async retrieveTraining() {
        const training = await this.trainingsService.retrieve(this.training);
        if (!training) {
            throw new NotFoundError('Training not found');
        }

        return training;
    }

    private async patchTraining(topics: TrainingTopic[]) {
        await this.trainingsService.updateTopics(this.training, topics);
    }

    constructor(
        private training: string,
        private trainingsService: TrainingsService,
        private user: AppUser,
    ) {}
}
