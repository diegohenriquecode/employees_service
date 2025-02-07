import express from 'express';
import validation from 'middlewares/validation';
import {ForbiddenError} from 'modules/errors/errors';
import TrainingProgressesService from 'modules/training-progresses/service';
import {out} from 'modules/trainings/schema';
import TrainingsService, {TrainingThumbnailUrlProps} from 'modules/trainings/service';

import config from '../../../config';
import UsersService from '../../../modules/users/service';
import {
    CreateTrainingSchema,
    GetUploadMapUrlSchema,
    QueryArgs,
    QuerySchema,
    SetDisabledSchema,
    TrainingProgressesQuery,
    TrainingProgressesServiceListArgsSchema,
    UpdateTrainingSchema,
} from './schema';
import topics from './topics/router';

const router = express.Router();
export default router;

router.post('/', validation(CreateTrainingSchema), async (req, res) => {
    const {account, user} = res.locals;

    const result = await TrainingsService.config(config, user, account.id)
        .create(req.body);

    res.send(out(result));
});

router.get('/', validation(QuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {order, orderBy} = req.query as unknown as QueryArgs;

    const result = await TrainingsService.config(config, user, account.id)
        .listByAccount({order, orderBy});

    res.send(result.map(out));
});

router.get('/:trainingId', async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;

    const result = await TrainingsService.config(config, user, account.id)
        .retrieve(trainingId);

    res.send(out(result));
});

router.put('/:trainingId', validation(UpdateTrainingSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;

    const result = await TrainingsService.config(config, user, account.id)
        .update(trainingId, req.body);

    res.send(out(result));
});

router.put('/:trainingId/disabled', validation(SetDisabledSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;
    const disabled = req.body;

    await TrainingsService.config(config, user, account.id)
        .setDisabled(trainingId, disabled);

    res.sendStatus(204);
});

router.get('/:trainingId/thumbnailUrl', validation(GetUploadMapUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;
    const query = req.query as unknown as TrainingThumbnailUrlProps;

    const result = await TrainingsService.config(config, user, account.id)
        .getThumbnailUploadUrl(trainingId, query);

    res.send(result);
});

router.get('/all/progress', validation(TrainingProgressesServiceListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    if (await user.ability.cannot('list', 'TrainingProgress')) {
        throw new ForbiddenError();
    }

    const {format, title, sector, ...query} = req.query as unknown as TrainingProgressesQuery;

    if (title) {
        const allTrainings = await TrainingsService.config(config, user, account.id)
            .listByAccount();
        query.training = allTrainings
            .filter(t => !title || t.title.includes(title))
            .map(t => t.id);
    }

    query.employee = await UsersService.config(config, user, account.id)
        .resolvedEmployees(query.employee, sector, query.deep, user, 'TrainingProgress');

    if (format === 'xlsx') {
        const result = await TrainingProgressesService.config(config, user, account.id)
            .generateAsyncReport(query);

        res.status(202).send(result);
    } else {
        const result = await TrainingProgressesService.config(config, user, account.id)
            .list(query);

        res.send(result);
    }
});

router.use('/:trainingId/topics', topics);
