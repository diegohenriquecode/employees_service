import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import TrainingProgressesService from 'modules/training-progresses/service';

import {RegisterProgressSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/all/progress', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;

    const result = await TrainingProgressesService.config(config, user, account.id)
        .listByEmployee(employeeId);

    res.send(result);
});

router.get('/:trainingId/progress', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, trainingId} = req.params as MergedParams<typeof req.params>;

    const result = await TrainingProgressesService.config(config, user, account.id)
        .retrieveOrCreate(employeeId, trainingId);

    res.send(result);
});

router.put('/:trainingId/topics/:topicId/progress', validation(RegisterProgressSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, trainingId, topicId} = req.params as MergedParams<typeof req.params>;
    const {progress} = req.body;

    await TrainingProgressesService.config(config, user, account.id)
        .registerProgress(employeeId, trainingId, topicId, progress);

    res.sendStatus(204);
});

type MergedParams<T> = T & {
  employeeId: string;
};
