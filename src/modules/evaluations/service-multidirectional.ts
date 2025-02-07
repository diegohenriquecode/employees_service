import Enjoi from 'enjoi';
import mergeWith from 'lodash/mergeWith';
import shuffle from 'lodash/shuffle';
import transform from 'lodash/transform';
import EmployeesService from 'modules/employees/service';
import {BadRequestError, ConflictError, ForbiddenError, UnprocessableEntity} from 'modules/errors/errors';
import OrgChartsService from 'modules/orgchart/service';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import {MultidirectionalEvaluation, MultidirectionalEvaluationByType} from './bases';
import EvaluationsRepository from './repository';
import {
    Answers,
    CreateMultidirectionalProps,
    Evaluation,
    EvaluationCore,
    EvaluationMultidirectional,
    EvaluationProps,
    EvaluationService,
    EvaluationStatus,
    MultidirectionalEvaluationInstance,
    RetrieveEvaluationsResponse,
    UpdateEvaluationProps,
} from './schema';
import {computedDaysLate, fixedFloat} from './utils';

export class MultidirectionalsService implements EvaluationService {
    async create(employee: User, {tag, deadline, evaluators, evaluatorsArray, type, sector}: CreateMultidirectionalProps): Promise<Evaluation> {
        if (!Object.keys(employee.sectors).includes(sector)) {
            throw new BadRequestError('Employee doesn\'t belongs to sector.');
        }

        const sectorList = await this.orgSectors.list(sector);
        const colaboratorsArray: any[] = await Promise.all(sectorList.map(currentSector => this.employeesService.sectorTeamWithLoggedUser(currentSector.id)));
        const colaborators = colaboratorsArray.flat();

        let coworkers: User[];
        const responsible = await this.users.getManager({id: employee.id, sector}) as string;

        if (evaluatorsArray && evaluatorsArray.length >= 2) {
            coworkers = colaborators;
        } else {
            const isManager = employee.sectors[sector].is_manager;
            coworkers = isManager
                ? await this.users.subordinate_to(this.account, employee.sector, employee.id)
                : await this.users.fromSector(this.account, employee.sector, employee.id);
        }

        const createProps = this.getCreateProps(employee, coworkers, {tag, deadline, evaluators, evaluatorsArray, type, sector}, responsible);

        return this.repository.create(createProps);
    }

    async batchCreateOnSector(sector: string, {tag, deadline, evaluators, type}: CreateMultidirectionalProps) {
        const sectorDetail = await this.orgSectors.retrieve(sector);
        let manager = sectorDetail.manager;
        const employees = await this.users.fromSector(this.account, sector);
        if (!manager) {
            manager = await this.users.getManager({id: employees[0].id, sector}) as string;
        }

        const subordinates = await this.users.subordinate_to(this.account, sector, manager || undefined);

        const batchCreateProps = employees.map(employee => {
            const coworkers = manager === employee.id
                ? subordinates
                : employees.filter(e => e.id !== employee.id);

            return this.getCreateProps(
                employee as User,
                coworkers as User[],
                {
                    tag,
                    deadline,
                    evaluators,
                    type,
                    sector,
                },
                manager,
            );
        });

        await this.repository.batchCreate(batchCreateProps);
    }

    async retrieve(evaluation: MultidirectionalEvaluationInstance, toFill?: false): Promise<Evaluation> {
        if (toFill) {
            const component = evaluation.evaluations
                .find(e => e.responsible === this.user.id);
            if (!component) {
                throw new ForbiddenError();
            }

            const {evaluations, result, ...rest} = evaluation;
            return {
                ...rest,
                ...component,
            };
        }

        return evaluation;
    }

    async retrieveEvaluations(evaluation: MultidirectionalEvaluationInstance): Promise<RetrieveEvaluationsResponse[]> {
        const {evaluations} = evaluation;
        return evaluations.map(({status, responsible}) => ({
            status,
            responsible,
        }));
    }

    async update(evaluation: MultidirectionalEvaluationInstance, patch: UpdateEvaluationProps): Promise<Evaluation> {
        const component = (evaluation).evaluations
            .find(e => e.responsible === this.user.id);
        if (!component) {
            throw new ForbiddenError();
        }

        if (component.status === EvaluationStatus.done) {
            throw new ConflictError('Evaluation status is done');
        }

        const template = MultidirectionalEvaluationByType[evaluation.type];

        const validation = questionsSchema(template).validate(patch.answers);
        if (validation.error) {
            throw new BadRequestError();
        }
        patch.answers = validation.value ?? patch.answers;

        const {type, ...update} = patch;
        Object.assign(component, update, {
            updated_at: moment().toISOString(),
            updated_by: this.user.id,
        });

        const result = await this.repository
            .update(evaluation, {});

        return this.retrieve(result as MultidirectionalEvaluationInstance);
    }

    async remove(evaluation: MultidirectionalEvaluationInstance, employee: string): Promise<void> {
        if (evaluation.evaluations.some(e => e.status === EvaluationStatus.done)) {
            throw new BadRequestError('Evaluation status is done');
        }

        return this.repository.remove(employee, evaluation.id);
    }

    async finish(evaluation: MultidirectionalEvaluationInstance): Promise<Evaluation> {
        const component = evaluation.evaluations
            .find(e => e.responsible === this.user.id);
        if (!component) {
            throw new ForbiddenError();
        }

        if (component.status === EvaluationStatus.done) {
            throw new ConflictError('Evaluation status is done');
        }

        const template = MultidirectionalEvaluationByType[evaluation.type];
        if (questionsSchema(template).validate(component.answers, {presence: 'required'}).error) {
            throw new BadRequestError('evaluation is not ready to finish');
        }

        const update: Partial<EvaluationCore & EvaluationProps & EvaluationMultidirectional> = {};
        Object.assign(component, {
            status: EvaluationStatus.done,
            finished_at: moment().toISOString(),
            daysLate: computedDaysLate(evaluation.deadline),
            updated_at: moment().toISOString(),
            updated_by: this.user.id,
        });

        if (evaluation.evaluations.every(e => e.status === EvaluationStatus.done)) {
            Object.assign(update, evaluationResult(evaluation, template));
        }

        const result = await this.repository
            .update(evaluation, update);

        return this.retrieve(result as MultidirectionalEvaluationInstance);
    }

    checkBelonging(arrStr, arrObj, key) {
        const keyObjects = new Set();

        arrObj.forEach(obj => {
            if (obj[key]) {
                keyObjects.add(obj[key]);
            }
        });

        return arrStr.every(obj => keyObjects.has(obj));
    }

    removeDuplicatesByProperty<T>(arr: T[], prop: keyof T): T[] {
        const seen = new Set();
        return arr.filter(item => {
            const value = item[prop];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    private getCreateProps(
        employee: User,
        coworkers: User[],
        {tag, deadline, evaluators: count, evaluatorsArray, type, sector}: CreateMultidirectionalProps,
        responsible: string | null,
    ) {
        if (!count) {
            throw new BadRequestError('Evaluators are mandatory for this type');
        }

        if (coworkers.length < count) {
            throw new UnprocessableEntity(`More responsibles than exists: ${count}`);
        }

        let evaluations = [];

        if (evaluatorsArray && evaluatorsArray.length >= 2) {
            if (!this.checkBelonging(evaluatorsArray, coworkers, 'id')) {
                throw new BadRequestError('Evaluators not belong to the coworkers');
            }

            evaluations = evaluatorsArray.map((evaluator) => {
                const matchCoworker = coworkers.find((coworker) => (
                    coworker.id === evaluator
                ));

                if (matchCoworker) {
                    return {
                        responsible: matchCoworker.id,
                        status: EvaluationStatus.created,
                        answers: {},
                        sector: matchCoworker.sector,
                    };
                }
            });

            evaluations.unshift({
                responsible: employee.id,
                status: EvaluationStatus.created,
                answers: {},
                sector: employee.sector,
            });

            evaluations = this.removeDuplicatesByProperty(evaluations, 'responsible');
            if (evaluations.length > 10) {
                throw new BadRequestError('Exceded max of 10 colaborators selecteded');
            }

        } else {
            const responsibles = [
                employee,
                ...shuffle(coworkers).slice(0, count),
            ];

            evaluations = responsibles
                .map(({id, sector: responsibleSector}) => ({
                    responsible: id,
                    status: EvaluationStatus.created,
                    answers: {},
                    sector: responsibleSector,

                }));
        }

        return {
            account: this.account,
            type,
            employee: employee.id,
            sector: sector || employee.sector,
            rank: employee.rank,
            responsible,
            tag,
            status: EvaluationStatus.created,
            deadline,
            evaluations,
        };
    }

    constructor(
        private repository: EvaluationsRepository,
        private users: UsersService,
        private account: string,
        private user: User,
        private orgSectors: OrgChartsService,
        private employeesService: EmployeesService,
    ) {}
}

function questionsSchema(template: MultidirectionalEvaluation) {
    return Enjoi.schema({
        type: 'object',
        properties: template.questions
            .reduce((obj, item) => ({...obj, [item.id]: template.schema}), {}),
    }).unknown(false);
}

export function evaluationResult(evaluation: MultidirectionalEvaluationInstance, template: MultidirectionalEvaluation) {
    const evaluations = evaluation.evaluations.filter(e => e.status === EvaluationStatus.done);
    return {
        status: EvaluationStatus.done,
        finished_at: moment().toISOString(),
        daysLate: computedDaysLate(evaluation.deadline),
        result: {
            self: avgResult(template, evaluations.filter(e => e.responsible === evaluation.employee).map(e => e.answers)),
            evaluators: avgResult(template, evaluations.filter(e => e.responsible !== evaluation.employee).map(e => e.answers)),
        },
    };

}

function avgResult(template: MultidirectionalEvaluation, answers: Array<Answers> = []) {
    const abilities = avgAnswers(template, answers);
    const competencies = avgCompetencies(template, abilities);

    return {
        abilities,
        competencies,
    };
}

function avgAnswers(template: MultidirectionalEvaluation, answers: Array<Answers> = []) {
    if (answers.length === 0) {
        return {};
    }

    answers = answers
        .map(toAbilities(template));

    const sum = answers
        .reduce(sumMerged);

    return transform(sum, (result: any, value: number, key: string) => result[key] = fixedFloat(value / answers.length));
}

function toAbilities(template: MultidirectionalEvaluation) {
    return (answers: Answers = {}) => Object.entries(answers)
        .map(([questionId, value]) => ({[template.questions.find(q => q.id === questionId).ability]: value}))
        .reduce(sumMerged);
}

function sumMerged(one: Answers, other: Answers) {
    return mergeWith({...one}, other, (a = 0, b = 0) => a + b);
}

function avgCompetencies(template: MultidirectionalEvaluation, abilities: Answers = {}) {
    return template.competencies
        .map(({id}) => id)
        .map(competency => {
            const abilitiesIds = template.abilities
                .filter(a => a.competency === competency);
            return {
                [competency]: abilitiesIds.length
                    ? fixedFloat(abilitiesIds.reduce((acc, {id: q}) => acc + abilities[q], 0) / abilitiesIds.length)
                    : 0,
            };
        }).reduce((obj, field) => Object.assign(obj, field), {});
}
