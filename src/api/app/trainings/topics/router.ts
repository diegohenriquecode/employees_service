import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import TrainingTopicsService from 'modules/training-topics/service';

import contents from './contents/router';
import {CreateTrainingTopicSchema, UpdateTrainingTopicSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.post('/', validation(CreateTrainingTopicSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params as MergedParams<typeof req.params>;

    const result = await TrainingTopicsService.config(config, user, account.id, trainingId)
        .create(req.body);

    res.send(result);
});

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params as MergedParams<typeof req.params>;

    const result = await TrainingTopicsService.config(config, user, account.id, trainingId)
        .listByTraining();

    res.send(result);
});

router.get('/:topicId', async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId, topicId} = req.params as MergedParams<typeof req.params>;

    const result = await TrainingTopicsService.config(config, user, account.id, trainingId)
        .retrieve(topicId);

    res.send(result);
});

router.delete('/:topicId', async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId, topicId} = req.params as MergedParams<typeof req.params>;

    await TrainingTopicsService.config(config, user, account.id, trainingId)
        .delete(topicId);

    res.sendStatus(204);
});

router.put('/:topicId', validation(UpdateTrainingTopicSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId, topicId} = req.params as MergedParams<typeof req.params>;

    const result = await TrainingTopicsService.config(config, user, account.id, trainingId)
        .update(topicId, req.body);

    res.send(result);
});

router.use('/:topicId/contents', contents);

type MergedParams<T> = T & {
  trainingId: string;
  contentId: string;
};
