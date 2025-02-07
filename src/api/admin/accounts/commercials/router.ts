import config from 'config';
import express from 'express';
import adminCan from 'middlewares/admin-can';
import validation from 'middlewares/validation';
import {Account, AccountContractUrlProps} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';
import CoachingRegistersService from 'modules/coaching-registers/service';
import {BadRequestError} from 'modules/errors/errors';
import EvaluationsService from 'modules/evaluations/service';
import FeedbacksService from 'modules/feedbacks/service';
import OrgChartsService from 'modules/orgchart/service';
import ReprimandsService from 'modules/reprimands/service';
import SessionsReportsService from 'modules/sessions-reports/service';
import SuspensionsService from 'modules/suspensions/service';
import TrainingsService from 'modules/trainings/service';

import {CreateComercialAccountSchema, FindQueryArgs, GetLogoPutUrl, GetLogoPutUrlSchema, GetUploadContractUrlSchema, QuerySessionsSchema, SetDisabledSchema, UpdateAccountResponsiblePassword, UpdateComercialAccountSchema} from '../schema';
import users from '../users/router';
import boletos from './boletos/router';

const router = express.Router();
export default router;
const can = (permission: string) => adminCan(permissionResources.commercialAccounts, permission);

router.use('/:accountId', async (req, res, next) => {
    const {accountId} = req.params;
    const userId = res.locals.oauth.token.user.id;
    const account = await AccountsService.config(config, userId)
        .retrieve(accountId);

    Object.assign(res.locals, {...res.locals, account});

    if (account.is_demo) {
        throw new BadRequestError('This isnt a comercial account');
    }

    next();
});

router.use('/:accountId/users', users);
router.use('/:accountId/boletos', boletos);

router.get('/', can(PermissionTypes.list), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {search} = req.query;

    const result = await AccountsService.config(config, userId)
        .list(false, search);

    res.send(result.map(list));
});

router.post('/', can(PermissionTypes.create), validation(CreateComercialAccountSchema), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {responsible, ...body} = req.body;

    const result = await AccountsService.config(config, userId)
        .create({...body, is_demo: false}, responsible);

    res.send(result);
});

router.get('/:accountId', can(PermissionTypes.detail), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;
    const {accountId} = req.params;

    const result = await AccountsService.config(config, userId)
        .findById(accountId);

    res.send(result);
});

router.put('/:accountId', can(PermissionTypes.edit), validation(UpdateComercialAccountSchema), async (req, res) => {
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

router.get('/:accountId/feedbacks/count', can(PermissionTypes.detail), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const count = await FeedbacksService.config(config, user, '')
        .countByAccount(accountId);

    res.send({count});
});

router.get('/:accountId/reprimands/count', can(PermissionTypes.detail), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const count = await ReprimandsService.config(config, user, {id: ''} as Account)
        .countByAccount(accountId);

    res.send({count});
});

router.get('/:accountId/coaching-registers/count', can(PermissionTypes.detail), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const count = await CoachingRegistersService.config(config, user, '')
        .countByAccount(accountId);

    res.send({count});
});

router.get('/:accountId/suspensions/count', can(PermissionTypes.detail), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const count = await SuspensionsService.config(config, user, {id: ''} as Account)
        .countByAccount(accountId);

    res.send({count});
});

router.get('/:accountId/trainings/count', can(PermissionTypes.detail), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const count = await TrainingsService.config(config, user, '')
        .countByAccount(accountId);

    res.send({count});
});

router.get('/:accountId/evaluations/count', can(PermissionTypes.detail), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const result = await EvaluationsService.config(config, user, {id: ''} as Account)
        .countByAccount(accountId);

    res.send(result);
});

router.get('/:accountId/sessions/count', can(PermissionTypes.detail), validation(QuerySessionsSchema, 'query'), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;
    const query = req.query as unknown as FindQueryArgs;
    const result = await SessionsReportsService.config(config, user)
        .countByRange(accountId, query);

    res.send(result);
});

router.get('/:accountId/sessions/lastActive', can(PermissionTypes.detail), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;
    const result = await SessionsReportsService.config(config, user)
        .lastVisited(accountId);

    res.send(result);
});

router.get('/:accountId/logoUrl', can(PermissionTypes.edit), validation(GetLogoPutUrlSchema, 'query'), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {ContentType, ContentLength} = req.query as unknown as GetLogoPutUrl;
    const {accountId} = req.params;

    const result = await AccountsService.config(config, userId)
        .pathUrl(accountId, {ContentType, ContentLength});

    res.send(result);
});

router.get('/:accountId/contractUrl', can(PermissionTypes.edit), validation(GetUploadContractUrlSchema, 'query'), async (req, res) => {
    const userId = res.locals.oauth.token.user.id;

    const {accountId} = req.params;

    const query = req.query as unknown as AccountContractUrlProps;

    const result = await AccountsService.config(config, userId)
        .pathUrl(accountId, query);

    res.send(result);
});

router.get('/:accountId/sectors/count', can(PermissionTypes.list), async (req, res) => {
    const {account} = res.locals;
    const userId = res.locals.oauth.token.user.id;
    const result = await OrgChartsService.config(config, userId, account.id).list();

    res.send({quantity: result.length});
});

function list(account: Account) {
    if (!account) {
        return account;
    }

    const {id, name, subdomain, disabled, created_at, created_by, updated_at, status, is_demo, updated_by, cnpj, type} = account;

    return {id, name, subdomain, disabled, created_at, created_by, updated_at, status, is_demo, updated_by, cnpj, type};
}
