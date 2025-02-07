import {CreateTrainingSchema, GetUploadMapUrlSchema, UpdateTrainingSchema} from 'api/app/trainings/schema';
import express from 'express';
import adminCan from 'middlewares/admin-can';
import validation from 'middlewares/validation';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';
import {out} from 'modules/trainings/schema';
import TrainingsService, {TrainingThumbnailUrlProps} from 'modules/trainings/service';

import config from '../../../config';
import topics from '../../app/trainings/topics/router';
import {SetDisabledSchema} from '../accounts/schema';

const router = express.Router();
export default router;
const can = (permission: string) => adminCan(permissionResources.trainings, permission);

router.post('/', can(PermissionTypes.create), validation(CreateTrainingSchema), async (req, res) => {
    const {account, user} = res.locals;

    const result = await TrainingsService.config(config, user, account.id)
        .create(req.body);

    res.send(out(result));
});

router.get('/', can(PermissionTypes.list), async (req, res) => {
    const {account, user} = res.locals;

    const result = await TrainingsService.config(config, user, account.id)
        .listByAccount();

    res.send(result.map(out));
});

router.get('/:trainingId', can(PermissionTypes.detail), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;

    const result = await TrainingsService.config(config, user, account.id)
        .retrieve(trainingId);

    res.send(out(result));
});

router.put('/:trainingId', can(PermissionTypes.edit), validation(UpdateTrainingSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;

    const result = await TrainingsService.config(config, user, account.id)
        .update(trainingId, req.body);

    res.send(out(result));
});

router.put('/:trainingId/disabled', can(PermissionTypes.edit), validation(SetDisabledSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;
    const disabled = req.body;

    await TrainingsService.config(config, user, account.id)
        .setDisabled(trainingId, disabled);

    res.sendStatus(204);
});

router.get('/:trainingId/thumbnailUrl', can(PermissionTypes.edit), validation(GetUploadMapUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {trainingId} = req.params;
    const query = req.query as unknown as TrainingThumbnailUrlProps;

    const result = await TrainingsService.config(config, user, account.id)
        .getThumbnailUploadUrl(trainingId, query);

    res.send(result);
});

router.use('/:trainingId/topics', topics);
