import express from 'express';
import omit from 'lodash/omit';
import can from 'middlewares/can';
import {ForbiddenError} from 'modules/errors/errors';
import {Evaluation} from 'modules/evaluations/schema';
import EvaluationsService from 'modules/evaluations/service';
import RolesService from 'modules/roles/service';
import UsersService from 'modules/users/service';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import {
    CreateEvaluationSchema,
    DetailEvaluationQuerySchema,
    FinishEvaluationSchema,
    FullUpdateEvaluationSchema,
    ListEvaluationQuery,
    ListEvaluationQuerySchema,
    SetReadSchema,
    UpdateEvaluationDeadlineSchema,
    UpdateEvaluationDisclosedToEmployeeSchema,
} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', validation(ListEvaluationQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;
    const {type, complete, from, to} = req.query as unknown as ListEvaluationQuery;

    const employee = await UsersService.config(config, user, account.id).retrieve(employeeId);

    /**
     * @TODO: Rever o sector que esta sendo passado para o can
     */
    const canList = await user.ability.can('list', RolesService.object('Evaluation', {type, employee: employeeId, sector: employee.sector}));
    if (!canList) {
        throw new ForbiddenError();
    }

    const result = await EvaluationsService.config(config, user, account)
        .listByEmployee(employeeId, type, complete, from, to);

    res.send(result.map(out));
});

router.post('/', can('create', 'Evaluation'), validation(CreateEvaluationSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const result = await EvaluationsService.config(config, user, account)
        .create(employeeId, req.body);

    res.send(out(result));
});

router.use('/:evaluationId', async (req, res, next) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params as unknown as {employeeId: string, evaluationId: string};
    const evaluation = await EvaluationsService.config(config, user, account)
        .retrieve(employeeId, evaluationId, req.query.toFill === 'true');

    res.locals.object = evaluation;
    next();
});

router.delete('/:evaluationId', can('delete', 'Evaluation'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params;

    await EvaluationsService.config(config, user, account)
        .remove(employeeId, evaluationId);

    res.sendStatus(204);
});

router.get('/:evaluationId/evaluators', can('list', 'Evaluation'), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params;

    const result = await EvaluationsService.config(config, user, account)
        .retrieveEvaluations(employeeId, evaluationId);

    res.send(result);
});

router.get('/:evaluationId', can('detail', 'Evaluation'), validation(DetailEvaluationQuerySchema, 'query'), async (req, res) => {
    const {user, object} = res.locals;

    let result = object;

    if ('evaluations' in result) {
        if (!(await user.ability.can('detail', RolesService.object('Evaluation', result), 'evaluations'))) {
            result = omit(result, ['evaluations']); // ToDo: use `permittedFieldsOf` from casl instead
        }
    }

    res.send(out(result));
});

router.put('/:evaluationId', can('update', 'Evaluation'), validation(FullUpdateEvaluationSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params;

    const result = await EvaluationsService.config(config, user, account)
        .update(employeeId, evaluationId, req.body);

    res.send(result);
});

router.put('/:evaluationId/deadline', can('update', 'Evaluation', 'deadline'), validation(UpdateEvaluationDeadlineSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params;

    const result = await EvaluationsService.config(config, user, account)
        .updateDeadline(employeeId, evaluationId, req.body);

    res.send(result);
});

router.put('/:evaluationId/disclosed_to_employee', can('update', 'Evaluation', 'disclosed_to_employee'), validation(UpdateEvaluationDisclosedToEmployeeSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params;

    const result = await EvaluationsService.config(config, user, account)
        .disclosedToEmployee(employeeId, evaluationId, req.body);

    res.send(result);
});

router.put('/:evaluationId/status', can('update', 'Evaluation', 'status'), validation(FinishEvaluationSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params;

    const result = await EvaluationsService.config(config, user, account)
        .finish(employeeId, evaluationId);

    res.send(out(result));
});

router.put('/:evaluationId/read', can('update', 'Evaluation', 'read'), validation(SetReadSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId, evaluationId} = req.params;

    await EvaluationsService.config(config, user, account)
        .setRead(employeeId, evaluationId);

    res.sendStatus(204);
});

function out(evaluation: Evaluation) {
    return omit(evaluation, ['tag']);
}
