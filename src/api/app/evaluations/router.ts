import config from 'config';
import express from 'express';
import can from 'middlewares/can';
import validation from 'middlewares/validation';
import {EvaluationType, ListProps} from 'modules/evaluations/schema';
import EvaluationsService from 'modules/evaluations/service';

import {NotFoundError} from '../../../modules/errors/errors';
import {APEEvaluation, DecisionsMatrix, MultidirectionalEvaluations} from '../../../modules/evaluations/bases';
import {
    EvaluationListArgs,
    EvaluationListArgsSchema,
    EvaluationReportArgs,
    EvaluationReportArgsSchema,
    EvaluationTemplateQuerySchema,
    MultipleFinishDecisionMatrixSchema,
    MultipleUpdateDecisionMatrixSchema,
} from './schema';

const router = express.Router();
export default router;

router.get('/', validation(EvaluationListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as EvaluationListArgs;

    const mongoQuery = user.ability
        .mongoQuery('Evaluation', 'list');

    if (query.type === EvaluationType.decision_matrix && query.format === 'xlsx') {
        const result = await EvaluationsService.config(config, user, account)
            .decisionMatrixGenerateAsyncReport(query as ListProps, mongoQuery);

        res.status(202).send(result);
    } else if (query.type === EvaluationType.ape && query.format === 'xlsx') {
        const result = await EvaluationsService.config(config, user, account)
            .apeGenerateAsyncReport(query as ListProps, mongoQuery);

        res.status(202).send(result);
    } else if (query.type === EvaluationType.ape && query.format === 'summary') {
        const result = await EvaluationsService.config(config, user, account)
            .APESummary(query as ListProps, mongoQuery);

        res.send(result);
    } else if (query.type === EvaluationType.multidirectional && query.format === 'xlsx') {
        const result = await EvaluationsService.config(config, user, account)
            .multidirectionalGenerateAsyncReport(query as ListProps, mongoQuery);

        res.status(202).send(result);
    } else {
        const result = await EvaluationsService.config(config, user, account)
            .list(query as ListProps, mongoQuery);

        res.send(result);
    }
});

router.get('/matrix/summary', validation(EvaluationReportArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as EvaluationReportArgs;

    const mongoQuery = user.ability
        .mongoQuery('Evaluation', 'list');

    const result = await EvaluationsService.config(config, user, account)
        .decisionMatrixSummary(query, mongoQuery);

    res.send(result);
});

router.get('/summary', validation(EvaluationListArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const query = req.query as unknown as EvaluationListArgs;

    const mongoQuery = user.ability
        .mongoQuery('Evaluation', 'list');

    const result = await EvaluationsService.config(config, user, account)
        .summary(query as ListProps, mongoQuery);

    res.send(result);
});

router.get('/multidirectional/templates', validation(EvaluationTemplateQuerySchema, 'query'), async (req, res) => {
    const result = MultidirectionalEvaluations
        .map(({type, title}) => ({type, title}));

    res.send(result);
});

router.get('/multidirectional/templates/:type', validation(EvaluationTemplateQuerySchema, 'query'), async (req, res) => {
    let result = MultidirectionalEvaluations
        .find(e => e.type === req.params.type);
    if (!result) {
        throw new NotFoundError();
    }

    result = {
        ...result,
        questions: result.questions
            .map(q => ({...q, competency: result.abilities.find(a => a.id === q.ability).competency})),
    };
    res.send(result);
});

router.get('/matrix/template', validation(EvaluationTemplateQuerySchema, 'query'), async (req, res) => {
    const template = DecisionsMatrix[0];

    if (!template) {
        throw new NotFoundError();
    }

    res.send(template);
});

router.put('/matrix', can('update', 'Evaluation'), validation(MultipleUpdateDecisionMatrixSchema), async (req, res) => {
    const {account, user} = res.locals;

    await EvaluationsService.config(config, user, account)
        .batchUpdate(req.body);

    res.sendStatus(204);
});

router.put('/matrix/status', can('update', 'Evaluation', 'status'), validation(MultipleFinishDecisionMatrixSchema), async (req, res) => {
    const {account, user} = res.locals;

    await EvaluationsService.config(config, user, account)
        .batchFinish(req.body);

    res.sendStatus(204);
});

router.get('/ape/template', validation(EvaluationTemplateQuerySchema, 'query'), async (req, res) => {
    const template = APEEvaluation[0];

    if (!template) {
        throw new NotFoundError();
    }

    res.send(template);
});
