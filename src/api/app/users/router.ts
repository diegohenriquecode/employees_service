import express from 'express';
import omit from 'lodash/omit';
import {AsyncTasksType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {AppUser} from 'modules/users/schema';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import UsersService from '../../../modules/users/service';
import {ConfirmImportSheetUploadSchema, GetImportSheetPutUrl, GetImportSheetPutUrlSchema} from '../async-tasks/schema';
import {CreateUserSchema, QueryUsersSchema, SetDisabledSchema, UpdatePasswordSchema, UpdateUserSchema} from './schema';

const router = express.Router();
export default router;

router.post('/', validation(CreateUserSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const result = await UsersService.config(config, user, account)
        .create({...req.body, account});
    res.send(details(result));
});

router.get('/', validation(QueryUsersSchema, 'query'), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const result = await UsersService.config(config, user, account)
        .list({...req.query, account, includeAdmin: true});
    result.items = result.items
        .map(list);

    res.send(result);
});

router.get('/:id', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const result = await UsersService.config(config, user, account)
        .retrieve(req.params.id);
    res.send(details(result));
});

router.put('/:id', validation(UpdateUserSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const result = await UsersService.config(config, user, account)
        .update(req.params.id, {...req.body});
    res.send(details(result));
});

router.put('/:id/disabled', validation(SetDisabledSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    await UsersService.config(config, user, account)
        .setDisabled(req.params.id, req.body);

    res.sendStatus(204);
});

router.get('/me/permissions', async (req, res) => {
    const {rules} = res.locals;
    res.send(rules);
});

router.put('/me/password', validation(UpdatePasswordSchema), async (req, res) => {
    const {account, user} = res.locals;

    await UsersService.config(config, user, account.id)
        .updatePassword(user.id, req.body.old_password, req.body.new_password);

    res.sendStatus(204);
});

router.get('/many/template', async (req, res) => {
    res.send({
        url: `${config.mailAssetsUrl}/template-users.xlsx`,
    });
});

router.get('/many/url', validation(GetImportSheetPutUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {ContentType, ContentLength, ContentDisposition} = req.query as unknown as GetImportSheetPutUrl;

    const result = await AsyncTasksService.config(config, user, account.id)
        .getImportSheetUploadUrl({ContentType, ContentLength, ContentDisposition}, AsyncTasksType.IMPORT_USERS);

    res.send(result);
});

router.post('/many/url', validation(ConfirmImportSheetUploadSchema), async (req, res) => {
    const {account, user} = res.locals;

    const result = await AsyncTasksService.config(config, user, account.id)
        .confirmImportSheetUpload(req.body.filePath, AsyncTasksType.IMPORT_USERS);

    res.send(result);
});

function list(user: AppUser) {
    if (!user) {
        return user;
    }

    const {id, username, name, email, sector, rank, disabled} = user;

    return {id, username, name, email, sector, rank, disabled};
}

function details(user: AppUser) {
    if (!user) {
        return user;
    }
    return {
        ...omit(user, [
            'birthday',
            'effectivated_at',
            'effective',
            'dismissed_at',
            'hired_at',
            'register',
            'avatar_key',
        ]),
        account: undefined,
        client_id: undefined,
    };
}
