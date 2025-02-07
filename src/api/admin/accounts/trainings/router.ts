import config from 'config';
import express from 'express';
import adminCan from 'middlewares/admin-can';
import validation from 'middlewares/validation';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';
import {BadRequestError} from 'modules/errors/errors';

import {CreateTrainingAccountSchema, GetLogoPutUrl, GetLogoPutUrlSchema, SetDisabledSchema, SetExpiryDateSchema, UpdateAccountResponsiblePassword, UpdateTrainingAccountSchema} from '../schema';
import users from '../users/router';
import asyncTasks from './async-tasks/router';
import managers from './managers/router';

const router = express.Router();
export default router;
const can = (permission: string) => adminCan(permissionResources.trainingAccounts, permission);

router.use('/:accountId/users', users);
router.use('/:accountId/managers', managers);
router.use('/:accountId/async-tasks', asyncTasks);

router.use('/:accountId', async (req, res, next) => {
    const {accountId} = req.params;
    const userId = res.locals.oauth.token.user.id;
    const account = await AccountsService.config(config, userId)
        .retrieve(accountId);

    Object.assign(res.locals, {...res.locals, account});

    if (!account.is_demo) {
        throw new BadRequestError('This isnt a training account');
    }

    next();
});

router.get('/', can(PermissionTypes.list), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {search} = req.query;

    const result = await AccountsService.config(config, userId)
        .list(true, search);

    res.send(result.map(list));
});

router.post('/', can(PermissionTypes.create), validation(CreateTrainingAccountSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {responsible, ...body} = req.body;

    const result = await AccountsService.config(config, userId)
        .create({...body, is_demo: true}, responsible);

    res.send(result);
});

router.get('/:accountId', can(PermissionTypes.detail), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;
    const {accountId} = req.params;

    const result = await AccountsService.config(config, userId)
        .findById(accountId);

    res.send(result);
});

router.put('/:accountId', can(PermissionTypes.edit), validation(UpdateTrainingAccountSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {accountId} = req.params;
    const {responsible, ...body} = req.body;

    const result = await AccountsService.config(config, userId)
        .update(accountId, body, responsible);

    res.send(result);
});

router.put('/:accountId/password', can(PermissionTypes.edit), validation(UpdateAccountResponsiblePassword), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {accountId} = req.params;
    const {password} = req.body;

    const result = await AccountsService.config(config, userId)
        .updateResponsiblePassword(accountId, password);

    res.send(result);
});

router.put('/:accountId/disabled', can(PermissionTypes.edit), validation(SetDisabledSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {accountId} = req.params;
    const disabled = req.body;

    await AccountsService.config(config, userId)
        .setDisabled(accountId, disabled);

    res.sendStatus(204);
});

router.put('/:accountId/expiry-date', can(PermissionTypes.edit), validation(SetExpiryDateSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {accountId} = req.params;
    const expiry_date = req.body;

    await AccountsService.config(config, userId)
        .setExpiryDate(accountId, expiry_date);

    res.sendStatus(204);
});

router.get('/:accountId/logoUrl', can(PermissionTypes.edit), validation(GetLogoPutUrlSchema, 'query'), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {ContentType, ContentLength} = req.query as unknown as GetLogoPutUrl;
    const {accountId} = req.params;

    const result = await AccountsService.config(config, userId)
        .pathUrl(accountId, {ContentType, ContentLength});

    res.send(result);
});

function list(account: Account) {
    if (!account) {
        return account;
    }

    const {id, name, subdomain, disabled, created_at, created_by, updated_at, status, is_demo, expiry_date, updated_by} = account;

    return {id, name, subdomain, disabled, created_at, created_by, updated_at, status, is_demo, expiry_date, updated_by};
}
