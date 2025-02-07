import config from 'config';
import express from 'express';
import {TrainingProgress} from 'modules/training-progresses/schema';
import TrainingProgressesService from 'modules/training-progresses/service';
import {ExternalTrainingTrail} from 'modules/training-trails/schema';
import TrainingTrailsService from 'modules/training-trails/service';
import TrainingsService from 'modules/trainings/service';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params as MergedParams<typeof req.params>;

    const trails = await TrainingTrailsService.config(config, user, account.id)
        .listByEmployee(employeeId);

    const employeeProgresses = await TrainingProgressesService.config(config, user, account.id)
        .listByEmployee(employeeId);

    res.send(trails.map(t => out(t, employeeProgresses)));
});

router.get('/:trainingTrailId', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, trainingTrailId} = req.params as MergedParams<typeof req.params>;

    const trail = await TrainingTrailsService.config(config, user, account.id)
        .retrieveByEmployee(trainingTrailId, employeeId);

    const employeeProgresses = await TrainingProgressesService.config(config, user, account.id)
        .listByEmployee(employeeId);

    res.send(out(trail, employeeProgresses));
});

router.get('/:trainingTrailId/trainings', async (req, res) => {
    const {account, user} = res.locals;
    const {employeeId, trainingTrailId} = req.params as MergedParams<typeof req.params>;

    const trainingIds = (await TrainingTrailsService.config(config, user, account.id)
        .retrieveByEmployee(trainingTrailId, employeeId)).trainings;

    const trainings = await TrainingsService.config(config, user, account.id)
        .listByEnableTrainingIds(trainingIds, employeeId);

    res.send(trainings);
});

type MergedParams<T> = T & {
  employeeId: string;
  trainingTrailId: string;
};

function out(trail: ExternalTrainingTrail, progresses: TrainingProgress[]) {
    const existing = Object.fromEntries(progresses.map(p => [p.training, p.progress]));

    const training_progresses = Object.fromEntries(trail.trainings.map(training => [training, existing[training] ?? 0]));

    const progressesArray = Object.values(training_progresses);
    const sum = progressesArray.reduce((total, curr) => total += curr, 0);
    const progress = (progressesArray.length > 0) ? Math.floor(sum / progressesArray.length) : 0;

    return {
        ...trail,
        training_progresses,
        progress,
    };
}
