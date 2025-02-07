import config from 'config';
import express from 'express';
import {orderBy} from 'lodash';
import maintenance from 'middlewares/maintenance';
import validation from 'middlewares/validation';
import {
    JobVacancySchema,
    JobVacancyUpdateSchema,
} from 'modules/job-vacancies/schema';
import JobVacanciesService from 'modules/job-vacancies/service';

import {SetDisabledSchema} from '../users/schema';

const router = express.Router();
export default router;

if (config.jobVacanciesMaintenance) {
    router.use(maintenance);
}

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const jobVacanciesService = JobVacanciesService.config(
        config,
        user,
        account.id,
    );
    const result = await jobVacanciesService.list();
    const resultDesc = orderBy(result, ['created_at'], ['desc']);
    res.send(resultDesc);
});

router.get('/:id', async (req, res) => {
    const {account, user} = res.locals;
    const {id} = req.params;

    const jobVacanciesService = JobVacanciesService.config(
        config,
        user,
        account.id,
    );
    const result = await jobVacanciesService.retrieve(id);
    res.send(result);

});

router.post('/', validation(JobVacancySchema), async (req, res) => {
    const {account, user} = res.locals;
    const jobVacancyData = req.body;

    const jobVacanciesService = JobVacanciesService.config(
        config,
        user,
        account.id,
    );
    const result = await jobVacanciesService.create(jobVacancyData);
    res.status(201).send(result);
});

router.put('/:id', validation(JobVacancyUpdateSchema, 'body'),
    async (req, res) => {
        const {account, user} = res.locals;

        const jobVacancyData = req.body;

        const {id} = req.params;

        const jobVacanciesService = JobVacanciesService.config(
            config,
            user,
            account.id,
        );

        const result = await jobVacanciesService.update(id, jobVacancyData);
        res.send(result);
    },
);

router.put('/:id/enabled', validation(SetDisabledSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    await JobVacanciesService.config(config, user, account)
        .setDisabled(req.params.id, req.body);

    res.sendStatus(204);
});
