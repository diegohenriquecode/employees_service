
import express from 'express';
import can from 'middlewares/can';
import validation from 'middlewares/validation';
import TrainingTrailsService, {TrainingTrailThumbnailUrlProps} from 'modules/training-trails/service';

import config from '../../../config';
import {CreateTrainingTrailSchema, GetUploadMapUrlSchema, SetDisabledSchema, TrainingTrailsArgs, TrainingTrailsArgsSchema, UpdateTrainingTrailSchema} from './schema';

const router = express.Router();
export default router;

router.post('/', can('create', 'TrainingTrail'), validation(CreateTrainingTrailSchema), async (req, res) => {
    const {account, user} = res.locals;

    const result = await TrainingTrailsService.config(config, user, account.id)
        .create(req.body);

    res.send(result);
});

router.get('/', can('list', 'TrainingTrail'), validation(TrainingTrailsArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;
    const {summary, detailed, sector, category, from, to, order, orderBy} = req.query as unknown as TrainingTrailsArgs;
    const trainingService = TrainingTrailsService.config(config, user, account.id);

    if (summary) {
        const result = detailed
            ? (await trainingService.listDetailedByCategory(sector, from, to, category))
            : (await trainingService.listByCategory(sector, from, to));
        res.send(result);
    } else {
        const props = orderBy ? {order, orderBy} : undefined;
        const result = await trainingService.listByAccount(props);
        res.send(result);
    }
});

router.use('/:trailId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {trailId} = req.params as unknown as {trailId: string};
    const trail = await TrainingTrailsService.config(config, user, account.id)
        .retrieve(trailId);

    res.locals.object = trail;
    next();
});

router.get('/:trainingTrailId', can('detail', 'TrainingTrail'), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingTrailId} = req.params;

    const result = await TrainingTrailsService.config(config, user, account.id)
        .retrieve(trainingTrailId);

    res.send(result);
});

router.put('/:trainingTrailId', can('update', 'TrainingTrail'), validation(UpdateTrainingTrailSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingTrailId} = req.params;

    const result = await TrainingTrailsService.config(config, user, account.id)
        .update(trainingTrailId, req.body);

    res.send(result);
});

router.put('/:trainingTrailId/disabled', can('update', 'TrainingTrail', 'disabled'), validation(SetDisabledSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingTrailId} = req.params;
    const disabled = req.body;

    await TrainingTrailsService.config(config, user, account.id)
        .setDisabled(trainingTrailId, disabled);

    res.sendStatus(204);
});

router.get('/:trainingTrailId/thumbnailUrl', can('update', 'TrainingTrail', 'thumbnailUrl'), validation(GetUploadMapUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingTrailId} = req.params;
    const query = req.query as unknown as TrainingTrailThumbnailUrlProps;

    const result = await TrainingTrailsService.config(config, user, account.id)
        .getThumbnailUploadUrl(trainingTrailId, query);

    res.send(result);
});
