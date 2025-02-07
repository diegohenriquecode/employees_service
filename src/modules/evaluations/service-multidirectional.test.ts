import {EvaluationStatus} from './schema';
import {evaluationResult} from './service-multidirectional';

describe('evaluationResult', () => {
    describe('simple template', () => {
        const template = {
            competencies: [
                {id: 'personal', title: 'Pessoais', text: 'Competências emocionais pessoais'},
                {id: 'social', title: 'Sociais', text: 'Competências emocionais sociais'},
            ],
            abilities: [
                {id: '1', competency: 'personal', title: 'Autoconsciência emocional'},
                {id: '2', competency: 'social', title: 'Autoavaliação precisa'},
            ],
            questions: [
                {id: '1', ability: '1', text: 'Identificar suas próprias emoções e reconhecer seu impactor nas ações e decisões'},
                {id: '2', ability: '2', text: 'Conhecer seus próprios limites e possibilidades, sem se supervalorizar ou subestimar'},
            ],
        };
        const evaluation = {
            employee: 'employee-id',
            evaluations: [
                {status: EvaluationStatus.done, responsible: 'employee-id', answers: {'1': 3, '2': 2}},
                {status: EvaluationStatus.done, responsible: 'evaluator-1-id', answers: {'1': 3, '2': 1}},
                {status: EvaluationStatus.done, responsible: 'evaluator-2-id', answers: {'1': 1, '2': 1}},
            ],
        };

        test('self result', () => {
            const {result: {self}} = evaluationResult(evaluation, template);
            expect(self.abilities['1']).toBe(3);
            expect(self.abilities['2']).toBe(2);
            expect(self.competencies['personal']).toBe(3);
            expect(self.competencies['social']).toBe(2);
        });

        test('evaluators result', () => {
            const {result: {evaluators}} = evaluationResult(evaluation, template);
            expect(evaluators.abilities['1']).toBe(2);
            expect(evaluators.abilities['2']).toBe(1);
            expect(evaluators.competencies['personal']).toBe(2);
            expect(evaluators.competencies['social']).toBe(1);
        });
    });

    describe('template with "subcategories"', () => {
        const template = {
            competencies: [
                {id: 'personal', title: 'Pessoais', text: 'Competências emocionais pessoais'},
                {id: 'social', title: 'Sociais', text: 'Competências emocionais sociais'},
            ],
            abilities: [
                {id: '1', competency: 'personal', title: 'Autoconsciência emocional'},
                {id: '2', competency: 'social', title: 'Autoavaliação precisa'},
            ],
            questions: [
                {id: '1', ability: '1', text: 'Identificar suas próprias emoções e reconhecer seu impactor nas ações e decisões'},
                {id: '2', ability: '1', text: 'Conhecer seus próprios limites e possibilidades, sem se supervalorizar ou subestimar'},
                {id: '3', ability: '2', text: 'Possuir um sólido senso do seu próprio valor, capacidade e potência'},
                {id: '4', ability: '2', text: 'Manter emoções e impulsos destrutivos sob controle'},
            ],
        };
        const evaluation = {
            employee: 'employee-id',
            evaluations: [
                {status: EvaluationStatus.done, responsible: 'employee-id', answers: {'1': 3, '2': 2, '3': 1, '4': 2}},
                {status: EvaluationStatus.done, responsible: 'evaluator-1-id', answers: {'1': 3, '2': 2, '3': 1, '4': 1}},
                {status: EvaluationStatus.done, responsible: 'evaluator-2-id', answers: {'1': 2, '2': 1, '3': 2, '4': 3}},
            ],
        };

        test('self result', () => {
            const {result: {self}} = evaluationResult(evaluation, template);
            expect(self.abilities['1']).toBe(5);
            expect(self.abilities['2']).toBe(3);
            expect(self.competencies['personal']).toBe(5);
            expect(self.competencies['social']).toBe(3);
        });

        test('evaluators result', () => {
            const {result: {evaluators}} = evaluationResult(evaluation, template);
            expect(evaluators.abilities['1']).toBe(4);
            expect(evaluators.abilities['2']).toBe(3.5);
            expect(evaluators.competencies['personal']).toBe(4);
            expect(evaluators.competencies['social']).toBe(3.5);
        });
    });
});
