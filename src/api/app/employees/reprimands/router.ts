import express from 'express';
import can from 'middlewares/can';
import {ForbiddenError} from 'modules/errors/errors';
import ReprimandsService from 'modules/reprimands/service';
import RolesService from 'modules/roles/service';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import {
    CreateReprimandSchema,
    GetAttachmentPutUrlSchema,
    UpdateReprimandSchema,
    UpdateReprimandStatusSchema,
} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params as {employeeId: string};

    const employee = await UsersService.config(config, user, account.id).retrieve(employeeId);

    if (await user.ability.cannot('list', RolesService.object('Reprimand', {employee: employeeId, sector: employee.sector}))) {
        throw new ForbiddenError();
    }

    const result = await ReprimandsService.config(config, user, account)
        .listByEmployee(employee as User);

    res.send(result);
});

router.post('/', validation(CreateReprimandSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const employee = await UsersService.config(config, user, account.id).retrieve(employeeId);

    const canList = await user.ability.can('create', RolesService.object('Reprimand', {employee: employeeId, sector: employee.sector}));
    if (!canList) {
        throw new ForbiddenError();
    }

    const result = await ReprimandsService.config(config, user, account)
        .create(employee as User, req.body);

    res.send(result);
});

router.use('/:reprimandId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {employeeId, reprimandId} = req.params as unknown as {employeeId: string, reprimandId: string};
    const reprimand = await ReprimandsService.config(config, user, account)
        .findById(employeeId, reprimandId);

    res.locals.object = reprimand;
    next();
});

router.get('/:reprimandId', can('detail', 'Reprimand'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, reprimandId} = req.params;

    const result = await ReprimandsService.config(config, user, account)
        .findById(employeeId, reprimandId);

    if (await user.ability.cannot('detail', RolesService.object('Reprimand', result))) {
        throw new ForbiddenError();
    }

    res.send(result);
});

router.put('/:reprimandId', can('update', 'Reprimand'), validation(UpdateReprimandSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, reprimandId} = req.params;

    const result = await ReprimandsService.config(config, user, account)
        .update(employeeId, reprimandId, req.body);

    res.send(result);
});

router.delete('/:reprimandId', can('delete', 'Reprimand'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, reprimandId} = req.params;

    await ReprimandsService.config(config, user, account)
        .delete(employeeId, reprimandId);

    res.sendStatus(204);
});

router.put('/:reprimandId/status', can('update', 'Reprimand', 'status'), validation(UpdateReprimandStatusSchema), async (req, res) => {
    const {account, user} = res.locals;
    const {employeeId, reprimandId} = req.params;

    const result = await ReprimandsService.config(config, user, account)
        .generate(employeeId, reprimandId);

    res.send(result);
});

router.get('/:reprimandId/attUrl', can('update', 'Reprimand'), validation(GetAttachmentPutUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;
    const {employeeId, reprimandId} = req.params;

    const result = await ReprimandsService.config(config, user, account)
        .attachmentUrl(employeeId, reprimandId, req.query);

    res.send(result);
});
