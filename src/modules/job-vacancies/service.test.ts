import {NotFoundError} from 'modules/errors/errors';

import JobVacanciesRepository from './repository';
import JobVacanciesService from './service';

jest.mock('./repository');

describe('JobVacanciesService', () => {
    let service;
    let repository;

    beforeEach(() => {
        repository = new JobVacanciesRepository();
        service = new JobVacanciesService(repository, {id: 'user-id'}, 'account-id');
    });

    it('should list job vacancies', async () => {
        repository.listByAccount = jest.fn().mockResolvedValue(['job1', 'job2']);
        const jobs = await service.list();
        expect(jobs).toEqual(['job1', 'job2']);
    });

    it('should retrieve a job vacancy by id', async () => {
        const job = {id: 'job-id'};
        repository.retrieve = jest.fn().mockResolvedValue(job);
        const retrievedJob = await service.retrieve('job-id');
        expect(retrievedJob).toEqual(job);
    });

    it('should create a job vacancy', async () => {
        const job = {requestDate: new Date(), title: 'New Job'};
        const createdJob = {id: 'new-job-id', ...job, requestDate: job.requestDate.toISOString()};
        repository.create = jest.fn().mockResolvedValue(createdJob);
        const result = await service.create(job);
        expect(result).toEqual({
            id: createdJob.id,
            created_by: createdJob.created_by,
            title: createdJob.title,
            function: createdJob.function,
            sector: createdJob.sector,
            responsibleManager: createdJob.responsibleManager,
        });
    });

    it('should update a job vacancy', async () => {
        const currentJob = {id: 'job-id', title: 'Old Title'};
        const updatedJob = {...currentJob, title: 'New Title'};
        repository.retrieve = jest.fn().mockResolvedValue(currentJob);
        repository.update = jest.fn().mockResolvedValue(updatedJob);

        const result = await service.update('job-id', {title: 'New Title'});
        expect(result).toEqual(updatedJob);
    });

    it('should throw NotFoundError when updating non-existent job vacancy', async () => {
        repository.retrieve = jest.fn().mockResolvedValue(null);
        await expect(service.update('non-existent-id', {title: 'New Title'})).rejects.toThrow(NotFoundError);
    });
});
