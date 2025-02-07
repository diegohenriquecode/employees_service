import set from 'lodash/set';
import {BadRequestError} from 'modules/errors/errors';

import {Evaluation, EvaluationAPE, EvaluationType, UpdateEvaluationPropsGeneric} from './schema';
import {ApesService} from './service-ape';
const user = {id: 'manager'};

const fakeEvaluation = (isComplete: boolean, path?: string, value?: unknown) => {
    const evaluation: Evaluation & EvaluationAPE = {
        type: EvaluationType.ape,
        responsible: 'manager',
        id: '0f08d75d-352a-4e2a-a365-412b3d2ff6c1',
        criteria: {answers: [{value: 1, id: '1'}, {value: 4, id: '2'}]},
    };

    if (!isComplete) {
        return evaluation;
    }

    for (let i = 0; i < 16; i++) {
        evaluation.criteria.answers[i] = {id: `${i + 1}`, value: 4};
    }

    if (path) {
        set(evaluation, path, value);
    }

    return evaluation;
};

const fakeEvaluationPatch = (path?: string, value?: unknown): UpdateEvaluationPropsGeneric<EvaluationAPE> => {
    const patch = {
        type: EvaluationType.decision_matrix,
        criteria: {answers: [{value: 1, id: '1'}, {value: 2, id: '2'}]},
    };

    if (path) {
        set(patch, path, value);
    }

    return patch;
};

describe('ApesService', () => {
    const service = new ApesService(null, null, user);

    describe('_update', () => {
        test('Aceita a evaluation como válida, mesmo que não esteja completamente respondida', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch()];
            const result = await service._update(evaluation, patch);
            const {type, ...expected} = patch;
            expect(result).toStrictEqual(expected);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um número maior que 4', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('criteria.answers[0].value', 5)];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um número menor que 1', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('criteria.answers[0].value', 0)];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um id inválido', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('criteria.answers[0].id', '22')];
            return expect(() => service._update(evaluation, patch)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque duas respostas possuem um mesmo id', async () => {
            const [evaluation, patch] = [fakeEvaluation(false), fakeEvaluationPatch('criteria.answers[0].id', '2')];
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

        test('Não aceita a evaluation, porque uma das respostas possui um número maior que 4', async () => {
            const evaluation = fakeEvaluation(true, 'criteria.answers[0].value', 5);
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um número menor que 1', async () => {
            const evaluation = fakeEvaluation(true, 'criteria.answers[0].value', 0);
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma das respostas possui um id inválido', async () => {
            const evaluation = fakeEvaluation(true, 'criteria.answers[0].id', '22');
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });

        test('Não aceita a evaluation, porque uma resposta está com id duplicado', async () => {
            const evaluation = fakeEvaluation(true, 'criteria.answers[0].id', '2');
            return expect(() => service._finish(evaluation)).toThrow(BadRequestError);
        });
    });
});
