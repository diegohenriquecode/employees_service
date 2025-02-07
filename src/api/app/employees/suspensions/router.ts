import express from 'express';
import can from 'middlewares/can';
import SuspensionsService from 'modules/suspensions/service';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import {ForbiddenError} from '../../../../modules/errors/errors';
import RolesService from '../../../../modules/roles/service';
import {
    CreateSuspensionschema,
    GetAttachmentPutUrlSchema,
    UpdateSuspensionschema,
    UpdateSuspensionstatusSchema,
} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const result = await SuspensionsService.config(config, user, account)
        .listByEmployee(employeeId);

    res.send(result);
});

router.post('/', validation(CreateSuspensionschema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const result = await SuspensionsService.config(config, user, account)
        .create(employeeId, req.body);

    res.send(result);
});

router.use('/:suspensionId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {employeeId, suspensionId} = req.params as unknown as {employeeId: string, suspensionId: string};
    const suspension = await SuspensionsService.config(config, user, account)
        .findById(employeeId, suspensionId);

    res.locals.object = suspension;
    next();
});

router.get('/:suspensionId', can('detail', 'Suspension'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, suspensionId} = req.params;

    const result = await SuspensionsService.config(config, user, account)
        .findById(employeeId, suspensionId);

    if (await user.ability.cannot('detail', RolesService.object('Suspension', result))) {
        throw new ForbiddenError();
    }

    res.send(result);
});

router.put('/:suspensionId', can('update', 'Suspension'), validation(UpdateSuspensionschema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, suspensionId} = req.params;

    const result = await SuspensionsService.config(config, user, account)
        .update(employeeId, suspensionId, req.body);

    res.send(result);
});

router.delete('/:suspensionId', can('delete', 'Suspension'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, suspensionId} = req.params;

    await SuspensionsService.config(config, user, account)
        .delete(employeeId, suspensionId);

    res.sendStatus(204);
});

router.put('/:suspensionId/status', can('update', 'Suspension', 'status'), validation(UpdateSuspensionstatusSchema), async (req, res) => {
    const {account, user} = res.locals;
    const {employeeId, suspensionId} = req.params;

    const result = await SuspensionsService.config(config, user, account)
        .generate(employeeId, suspensionId);

    res.send(result);
});

router.get('/:suspensionId/attUrl', can('update', 'Suspension'), validation(GetAttachmentPutUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;
    const {employeeId, suspensionId} = req.params;

    if (await user.ability.cannot('update', RolesService.object('Suspension', {employee: employeeId}))) {
        throw new ForbiddenError();
    }

    const result = await SuspensionsService.config(config, user, account)
        .attachmentUrl(employeeId, suspensionId, req.query);

    res.send(result);
});
