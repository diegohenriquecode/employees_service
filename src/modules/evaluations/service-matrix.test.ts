import set from 'lodash/set';
import {BadRequestError} from 'modules/errors/errors';

import {Evaluation, EvaluationDecisionMatrix, EvaluationType, UpdateEvaluationPropsGeneric} from './schema';
import {MatricesService} from './service-matrix';
const user = {id: 'manager'};

const fakeEvaluation = (isComplete: boolean, path?: string, value?: unknown) => {
    const evaluation: Evaluation & EvaluationDecisionMatrix = {
        technical: {answers: [{value: 4, id: '1'}, {value: 2, id: '2'}]},
        emotional: {answers: [{value: 4, id: '18'}]},
        type: EvaluationType.decision_matrix,
        responsible: 'manager',
        id: '0f08d75d-352a-4e2a-a365-412b3d2ff6c1',
    };

    if (!isComplete) {
        return evaluation;
    }

    for (let i = 3; i <= 17; i++) {
        evaluation.technical.answers.push({id: `${i}`, value: 5});
    }

    for (let i = 19; i <= 30; i++) {
        evaluation.emotional.answers.push({id: `${i}`, value: 5});
    }

    if (path) {
        set(evaluation, path, value);
    }

    return evaluation;
};

const fakeEvaluationPatch = (path?: string, value?: unknown): UpdateEvaluationPropsGeneric<EvaluationDecisionMatrix> => {
    const patch = {
        type: EvaluationType.decision_matrix,
        technical: {answers: [{value: 4, id: '1'}, {value: 2, id: '2'}]},
        emotional: {answers: [{value: 4, id: '22'}]},
    };

    if (path) {
        set(patch, path, value);
    }

    return patch;
};

describe('MatricesService', () => {
    const service = new MatricesService(
        null,
        null,
        null,
        null,
        null,
        'test-account',
        user,
    );

    describe('_update', () => {
        test('Aceita a evaluation como válida, mesmo que não esteja completamente respondida', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch()];
            const result = await service._update(evaluation, patch);
            const {type, ...expected} = patch;
            expect(result).toStrictEqual(expected);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um número maior que 10', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('technical.answers[0].value', 11)];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um número menor que 0', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('technical.answers[0].value', -1)];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas na competência technical possui um id inválido', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('technical.answers[0].id', '22')];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas na competência emotional possui um id inválido', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('emotional.answers[0].id', '2')];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque duas das respostas na competência technical possuem um mesmo id', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('technical.answers[0].id', '2')];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });
    });

    describe('_finish', () => {
        test('Não aceita a evaluation como válida, porque ela não está completamente respondida', async () => {
            const evaluation = fakeEvaluation(false);
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Aceita a evaluation como válida, porque ela está completamente respondida', async () => {
            const evaluation = fakeEvaluation(true);
            const result = await service._finish(evaluation);
            expect(result.status).toStrictEqual('done');
        });

        test('Não aceita a evaluation, porque uma das respostas possui um número maior que 10', async () => {
            const evaluation = fakeEvaluation(true, 'technical.answers[0].value', 11);
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um número menor que 0', async () => {
            const evaluation = fakeEvaluation(true, 'technical.answers[0].value', -1);
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas na competência technical possui um id inválido', async () => {
            const evaluation = fakeEvaluation(true, 'technical.answers[0].id', '22');
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas na competência emotional possui um id inválido', async () => {
            const evaluation = fakeEvaluation(true, 'emotional.answers[0].id', '2');
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas na competência emotional está com id duplicado', async () => {
            const evaluation = fakeEvaluation(true, 'emotional.answers[0].id', '22');
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });
    });
});
