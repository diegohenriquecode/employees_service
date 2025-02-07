import config from 'config';
import express from 'express';
import adminCan from 'middlewares/admin-can';
import validation from 'middlewares/validation';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';
import AdminsService from 'modules/admins/service';

import {CreateAdminSchema, SetDisabledSchema, UpdateAdminSchema} from './schema';

const router = express.Router({mergeParams: true});

export default router;
const can = (permission: string) => adminCan(permissionResources.admins, permission);

router.get('/', can(PermissionTypes.list), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const result = await AdminsService.config(config, userId)
        .list();

    res.send(result);
});

router.post('/', can(PermissionTypes.create), validation(CreateAdminSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const result = await AdminsService.config(config, userId)
        .create(req.body);

    res.send(result);
});

router.get('/me', async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const result = await AdminsService.config(config, userId)
        .retrieve(userId);

    res.send(result);
});

router.get('/:adminId', can(PermissionTypes.detail), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {adminId} = req.params;

    const result = await AdminsService.config(config, userId)
        .retrieve(adminId);

    res.send(result);
});

router.put('/:adminId', can(PermissionTypes.edit), validation(UpdateAdminSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {adminId} = req.params;

    const result = await AdminsService.config(config, userId)
        .update(adminId, req.body);

    res.send(result);
});

router.put('/:id/disabled', can(PermissionTypes.edit), validation(SetDisabledSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {id} = req.params;
    const disabled = req.body;

    await AdminsService.config(config, userId)
        .setDisabled(id, disabled);

    res.sendStatus(204);
});
