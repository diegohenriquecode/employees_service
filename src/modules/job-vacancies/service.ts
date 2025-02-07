import {BarueriConfig} from 'config';
import {NotFoundError} from 'modules/errors/errors';

import JobVacanciesRepository from './repository';
import {JobVacancy} from './schema';

export default class JobVacanciesService {
    static config(cfg: BarueriConfig, user: any, accountId: string) {
        return new JobVacanciesService(
            JobVacanciesRepository.config(cfg, user.id, accountId),
            user,
            accountId,
        );
    }

    async list() {
        return await this.repository.listByAccount();
    }

    async retrieve(id: string) {
        return await this.repository.retrieve(id);
    }

    async create(props: JobVacancy) {
        const result = await this.repository.create({
            ...props,
            requestDate: props.requestDate.toISOString(),
        });

        return {
            id: result.id,
            created_by: result.create_by,
            title: result.title,
            function: result.function,
            sector: result.sector,
            responsibleManager: result.responsibleManager,
        };
    }

    async update(id: string, props: Partial<JobVacancy>) {
        const current = await this.repository.retrieve(id);
        if (!current) {
            throw new NotFoundError('Job Vacancy not found');
        }

        const updatedProps = Object.fromEntries(
            Object.entries(props).map(([key, value]) => [
                key,
                value instanceof Date ? value.toISOString() : value,
            ]),
        );

        const updated = await this.repository.update(current, updatedProps);

        return updated;
    }

    async setDisabled(id: string, value: boolean) {
        const current = await this.repository.retrieve(id);
        if (!current) {
            throw new NotFoundError('Job Vacancy not found');
        }

        await this.repository
            .update(current, {enabled: value});
    }

    constructor(
    private repository: JobVacanciesRepository,
    private user: any,
    private accountId: string,
    ) {}
}
