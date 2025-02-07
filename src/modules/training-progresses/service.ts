import {BarueriConfig} from 'config';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import {Account} from 'modules/accounts/schema';
import {ExportReportsType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {getFormattedDate, mapper} from 'modules/async-tasks/utils';
import {ExternalTraining} from 'modules/trainings/schema';
import TrainingsService from 'modules/trainings/service';
import {AppUser} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';
import {QueryOptions} from 'utils/mysql';

import TrainingProgressesRepository from './repository';
import TrainingProgressesMysqlRepository from './repository.mysql';
import {TrainingProgress, TrainingProgressesServiceListProps} from './schema';

export default class TrainingProgressesService {
    static config(cfg: BarueriConfig, user: AppUser, accountId: string): TrainingProgressesService {
        return new TrainingProgressesService(
            TrainingProgressesRepository.config(cfg, user.id, accountId),
            TrainingProgressesMysqlRepository.config(cfg, user.id, accountId),
            TrainingsService.config(cfg, user, accountId),
            UsersService.config(cfg, user, accountId),
            AsyncTasksService.config(cfg, user, accountId),
            accountId,
        );
    }

    async retrieveOrCreate(employee: string, training: string) {
        const currentTraining = await this.trainings.retrieve(training);

        let current = await this.repository.retrieve(employee, currentTraining.id);
        if (!current) {
            const topics = Object.fromEntries(currentTraining.topics.map(t => [t.id, {progress: 0}]));
            current = await this.repository.create(currentTraining.id, {employee, topics, progress: 0});
        }

        return await this.syncWithTraining(currentTraining, current);
    }

    async registerProgress(employee: string, training: string, topic: string, progress: number) {
        const current = await this.retrieveOrCreate(employee, training);

        const updatedTopics = Object.assign(cloneDeep(current.topics), {[topic]: {progress}});

        await this.repository.update(current, {
            topics: updatedTopics,
            progress: this.computeProgress(updatedTopics),
        });
    }

    async listByEmployee(employee: string) {
        return await this.repository.listByEmployee(employee);
    }

    async list(props: TrainingProgressesServiceListProps) {
        const query = await this.getListQuery(props);
        if (!query) {
            return {
                items: [],
                page: 0,
                pageSize: 10,
                total: 0,
            };
        }

        const {page, pageSize, order, orderBy} = props;
        const queryOptions: QueryOptions = {};
        if (page !== undefined && pageSize) {
            Object.assign(queryOptions, {pagination: {page, pageSize}});
        }

        if (orderBy) {
            Object.assign(queryOptions, {ordering: {order: order ?? 'ASC', orderBy: orderBy}});
        }

        const [total, items] = await Promise.all([
            this.mysql.count(query),
            this.mysql.list(query, queryOptions),
        ]);

        return {
            items,
            page,
            pageSize,
            total,
        };
    }

    async generateAsyncReport(props: TrainingProgressesServiceListProps) {
        const data = {
            type: ExportReportsType.TRAINING,
            query: props,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async generateAsyncReportBody(props: TrainingProgressesServiceListProps, account: Account) {
        const query = await this.getListQuery(props);
        const trainingProgressesFromDB = query ? await this.mysql.list(query) : [];
        if (!trainingProgressesFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: trainingProgressesFromDB.map(training => training.employee || ''),
            account: this.account,
        });

        const trainings = await this.trainings.listByIds(
            trainingProgressesFromDB.map(({training}) => training || ''),
        );

        const trainingProgresses = trainingProgressesFromDB.map(trainingProgress => ({
            'employee':
                employees.find(e => trainingProgress.employee === e.id)?.name || '',
            'title':
                trainings.find(t => trainingProgress.training === t.id)?.title || '',
            'progress':
                this.getTrainingProgress(trainingProgress.progress),
            'created_at':
                getFormattedDate(trainingProgress.created_at),
            'finished_at':
                this.getTrainingProgressFinishedAt(trainingProgress),
            'updated_at':
                getFormattedDate(trainingProgress.updated_at),
        }));

        return mapper(account, ExportReportsType.TRAINING, trainingProgresses);
    }

    private async getListQuery(props: TrainingProgressesServiceListProps) {
        if (props.training?.length === 0) {
            return null;
        }
        if (props.employee?.length === 0) {
            return null;
        }

        const clauses = [
            ...(isEmpty(props.training) ? [] : [{training: {$in: props.training}}]),
            ...(isEmpty(props.employee) ? [] : [{employee: {$in: props.employee}}]),
            {account: {$eq: this.account}},
            {'updated_at': {'$gte': moment(props.from).toISOString()}},
            {'created_at': {'$lte': moment(props.to).toISOString()}},
        ];
        return {$and: clauses};
    }

    private async syncWithTraining(training: ExternalTraining, progress: TrainingProgress) {
        let current = progress;

        if (training.topics) {
            const topicsWithoutProgress = training.topics.filter(t => !Object.keys(current.topics).includes(t.id));

            if (topicsWithoutProgress.length > 0) {
                const newTopics = Object.fromEntries(topicsWithoutProgress.map(t => [t.id, {progress: 0}]));
                const topics = Object.assign(cloneDeep(current.topics), newTopics);

                current = await this.repository.update(current, {
                    topics,
                    progress: this.computeProgress(topics),
                });
            }

            const hasProgressesWithoutTopic = Object.keys(training.topics).length !== Object.keys(current.topics).length;

            if (hasProgressesWithoutTopic) {
                const topics = Object.fromEntries(
                    Object.entries(current.topics)
                        .filter(([id]) => training.topics.map(t => t.id).includes(id)),
                );

                current = await this.repository.update(current, {
                    topics,
                    progress: this.computeProgress(topics),
                });
            }
        }

        return current;
    }

    private computeProgress(topics: TrainingProgress['topics']) {
        const topicsArray = Object.values(topics);
        const sum = topicsArray.reduce((total, curr) => total += curr.progress, 0);
        return (topicsArray.length > 0) ? Math.floor(sum / topicsArray.length) : 0;
    }

    private getTrainingProgress(progress: number | undefined = 0) {
        return (progress / 100).toFixed(2);
    }

    private getTrainingProgressFinishedAt(trainingProgress: Partial<TrainingProgress>) {
        return trainingProgress.progress === 10000 ?
            getFormattedDate(trainingProgress.updated_at)
            : 'report.training-progress.outgoing-training';
    }

    constructor(
        private repository: TrainingProgressesRepository,
        private mysql: TrainingProgressesMysqlRepository,
        private trainings: TrainingsService,
        private users: UsersService,
        private tasks: AsyncTasksService,
        private account: string,
    ) { }
}
