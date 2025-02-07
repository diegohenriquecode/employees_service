import express from 'express';
import me from 'middlewares/me';
import ConfigurationService from 'modules/configuration/service';
import EmployeesService from 'modules/employees/service';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import {ForbiddenError} from '../../../modules/errors/errors';
import absences from './absences/router';
import climateChecks from './climate-checks/router';
import coachingRegisters from './coaching-registers/router';
import dismissInterviews from './dismiss-interviews/router';
import evaluationsScheduler from './evaluations-scheduler/router';
import evaluations from './evaluations/router';
import feedbacks from './feedbacks/router';
import history from './history/router';
import pendingActions from './pending-actions/router';
import reprimands from './reprimands/router';
import {GetAvatarPutUrlSchema, QueryEmployeesArgs, QueryEmployeesSchema, UpdateEmployeeSchema} from './schema';
import suspensions from './suspensions/router';
import timelines from './timelines/router';
import trainingTrails from './training-trails/router';
import trainings from './trainings/router';
import unseenItems from './unseen-items/router';
import vacations from './vacations/router';

const router = express.Router();
export default router;

router.param('employeeId', me);

router.get('/', validation(QueryEmployeesSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as QueryEmployeesArgs;

    const result = await EmployeesService.config(config, user, account.id)
        .list(query);

    const allowedFields = user.ability.onlyAllowedFields('Employee', 'list');
    result.items = result.items
        .map(list)
        .map(allowedFields);

    result.items = await Promise.all(result.items);

    res.send(result);
});

router.get('/:employeeId', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const result = await EmployeesService.config(config, user, account)
        .retrieve(req.params.employeeId);

    const allowedFields = user.ability.onlyAllowedFields('Employee');

    res.send(await allowedFields(details(result)));
});

router.put('/:employeeId', validation(UpdateEmployeeSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const result = await EmployeesService.config(config, user, account.id)
        .update(employeeId, req.body);

    res.send(details(result));
});

router.get('/:employeeId/avatarUrl', validation(GetAvatarPutUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    if (await user.ability.cannot('update', 'Employee', 'avatarUrl')) {
        throw new ForbiddenError();
    }

    const permissions = await ConfigurationService.config(config, user.id, account.id)
        .retrieve();

    if ((!permissions || !permissions.usersCanEditAvatar) && (await user.ability.cannot('update', 'Employee', 'name'))) {
        throw new ForbiddenError();
    }

    const result = await EmployeesService.config(config, user, account.id)
        .avatarUrl(req.params.employeeId, req.query);

    res.send(result);
});

router.use('/me/climate-checks', climateChecks);
router.use('/:employeeId/feedbacks', feedbacks);
router.use('/:employeeId/coaching-registers', coachingRegisters);
router.use('/:employeeId/evaluations', evaluations);
router.use('/:employeeId/pending-actions', pendingActions);
router.use('/:employeeId/timelines', timelines);
router.use('/:employeeId/reprimands', reprimands);
router.use('/:employeeId/suspensions', suspensions);
router.use('/:employeeId/history', history);
router.use('/:employeeId/trainings', trainings);
router.use('/:employeeId/vacations', vacations);
router.use('/:employeeId/evaluations-scheduler', evaluationsScheduler);
router.use('/:employeeId/unseen-items', unseenItems);
router.use('/:employeeId/dismiss-interviews', dismissInterviews);
router.use('/:employeeId/training-trails', trainingTrails);
router.use('/:employeeId/absences', absences);

function list(user: any) {
    if (!user) {
        return user;
    }

    const {id, name, sector, rank, disabled, avatarUrl, hired_at} = user;

    return {id, name, sector, rank, disabled, avatarUrl, hired_at};
}

function details(user: any) {
    if (!user) {
        return user;
    }
    return {
        ...user,
        manager_of: Object.keys(user.sectors).filter(s => user.sectors[s].is_manager),
        account: undefined,
        client_id: undefined,
    };
}
