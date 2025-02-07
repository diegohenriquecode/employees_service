import config from 'config';
import express from 'express';
import adminCan from 'middlewares/admin-can';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';
import {FaqSchema} from 'modules/faq/schema';
import FaqService from 'modules/faq/service';

import validation from '../../../middlewares/validation';
import {SetDisabledSchema, UpdateFaqSchema} from './schema';

const router = express.Router();
const can = (permission: string) => adminCan(permissionResources.faq, permission);

router.post('/', can(PermissionTypes.create), validation(FaqSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const data = await FaqService.config(config, userId).create(req.body);

    res.send(data);
});

router.get('/', can(PermissionTypes.list), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const list = await FaqService.config(config, userId).list();

    return res.send(list);
});

router.get('/:id', can(PermissionTypes.detail), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {id} = req.params;

    const data = await FaqService.config(config, userId).retrieve(id);

    res.send(data);
});

router.patch('/:id', can(PermissionTypes.edit), validation(UpdateFaqSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;
    const {id} = req.params;

    const data = await FaqService.config(config, userId).update(id, req.body);

    res.send(data);
});

router.put('/:id/disabled', can(PermissionTypes.edit), validation(SetDisabledSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;
    const {id} = req.params;

    const disabled = req.body;

    const faqService = FaqService.config(config, userId);
    await faqService.update(id, {
        disabled,
    });

    res.sendStatus(204);
});

router.delete('/:id', can(PermissionTypes.delete), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;
    const {id} = req.params;

    await FaqService.config(config, userId).delete(id);

    res.sendStatus(204);
});

export default router;
