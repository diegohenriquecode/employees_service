import Enjoi from 'enjoi';
import countBy from 'lodash/countBy';
import some from 'lodash/some';
import {BadRequestError, ForbiddenError, NotFoundError, UnprocessableEntity} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import OrgSectorsService from 'modules/orgchart/service';
import {AppUser, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import {DecisionMatrixType, EvaluationBaseByType} from './bases';
import EvaluationsRepository from './repository';
import EvaluationsMysqlRepository from './repository.mysql';
import {
    BatchUpdateEvaluationProps,
    CreateEvaluationProps,
    DecisionMatrixResults,
    Evaluation,
    EvaluationDecisionMatrix,
    EvaluationProps,
    EvaluationRemoveOnSectorEventMessage,
    EvaluationService,
    EvaluationStatus,
    EvaluationType,
    UpdateEvaluationPropsGeneric,
} from './schema';
import {computedDaysLate, fixedFloat} from './utils';

export class MatricesService implements EvaluationService {
    async create(employeeUser: User, props: CreateEvaluationProps): Promise<Evaluation> {
        const sector = props.sector || employeeUser.sector;
        if (!Object.keys(employeeUser.sectors).includes(sector)) {
            throw new BadRequestError('Employee doesn\'t belongs to sector');
        }

        const responsible = await this.users.getManager({...employeeUser, sector});
        if (!responsible) {
            throw new BadRequestError('Cannot set responsible');
        }

        return this.repository
            .create({
                ...props,
                sector,
                responsible,
                disclosed_to_employee: false,
                emotional: {answers: []},
                technical: {answers: []},
            });
    }

    async batchCreateOnSector(sectorId: string, props: Pick<EvaluationProps, 'tag' | 'type' | 'deadline' | 'account' | 'status'>) {
        const sector = await this.orgSectors.find(sectorId);
        // ToDo: rever comportamento esperado:
        // - Gerar matriz para subordinados do gestor desse setor (descendo até onde for necessário)
        // - Gerar matriz para colaboradores desse setor (subindo pra procurar gestor)
        const responsible = sector.tree.manager;
        if (!responsible) {
            throw new BadRequestError('Cannot set responsible');
        }

        const users = await this.users.subordinate_to(this.account, sectorId, sector.tree.manager ?? undefined);
        if (users.length === 0) {
            throw new UnprocessableEntity('No employees found');
        }

        await this.repository.batchCreate(users.map(user => ({
            ...props,
            employee: user.id,
            sector: user.sector,
            rank: user.rank,
            responsible,
            disclosed_to_employee: false,
            emotional: {answers: []},
            technical: {answers: []},
        })));
    }

    async batchCreateOnSectorDeep(sectorId: string, props: Pick<EvaluationProps, 'type' | 'tag' | 'deadline' | 'account' | 'status'>) {
        const sectors = await this.orgSectors.list(sectorId);
        const {ability, ...user} = this.user;
        for (const sector of sectors) {
            await this.events.publish(
                'CreateEvaluationOnSector',
                1,
                'api',
                {...props, sector: sector.id, user},
                this.account,
            );
        }
    }

    async retrieve(evaluation: Evaluation) {
        return evaluation;
    }

    async update(evaluation: Evaluation & EvaluationDecisionMatrix, patch: UpdateEvaluationPropsGeneric<EvaluationDecisionMatrix>) {
        const update = this._update(evaluation, patch);

        return this.repository.update(evaluation, update);
    }

    async batchUpdate(patches: BatchUpdateEvaluationProps<EvaluationDecisionMatrix>) {
        const toBeUpdated = [];

        for (const {id, employee, ...patch} of patches) {
            const evaluation = await this.repository.retrieve(employee, id) as Evaluation & EvaluationDecisionMatrix;
            if (!evaluation) {
                throw new NotFoundError();
            }
            const update = this._update(evaluation, patch);
            toBeUpdated.push({current: evaluation, update});
        }

        await this.repository.batchUpdate(toBeUpdated);
    }

    async finish(evaluation: Evaluation & EvaluationDecisionMatrix) {
        const update = this._finish(evaluation);

        return await this.repository.update(evaluation, update);
    }

    async batchFinish(patches: BatchUpdateEvaluationProps<EmptyObject>) {
        const toBeUpdated = [];

        for (const {id, employee} of patches) {
            const evaluation = await this.repository.retrieve(employee, id) as Evaluation & EvaluationDecisionMatrix;
            if (!evaluation) {
                throw new NotFoundError();
            }
            const update = this._finish(evaluation);
            toBeUpdated.push({current: evaluation, update});
        }

        await this.repository.batchUpdate(toBeUpdated);
    }

    async batchRemoveOnSector(sector: string, type?: EvaluationType) {
        const clauses: unknown[] = [
            {created_by: {$eq: this.user.id}},
            {sector: {$eq: sector}},
            {status: {$ne: EvaluationStatus.done}},
        ];

        if (type) {
            clauses.push({type: {$eq: type}});
        }

        const query = {$and: clauses};

        const {items: evaluations} = await this.mysql.list(query);

        await this.repository.batchUpdate(evaluations.map((evaluation) => ({current: evaluation, update: {removed: true}})));
    }

    async batchRemoveOnSectorDeep(sectorId: string, type?: EvaluationType) {
        const sectors = await this.orgSectors.list(sectorId);
        const {ability, ...user} = this.user;
        for (const sector of sectors) {
            const data: EvaluationRemoveOnSectorEventMessage = {
                account: this.account,
                sector: sector.id,
                type,
                user,
                requested_at: moment().toISOString(),
            };
            await this.events.publish(
                'RemoveEvaluationOnSector',
                1,
                'api',
                JSON.stringify(data),
                this.account,
            );
        }
    }

    private _update(evaluation: Evaluation & EvaluationDecisionMatrix, patch: UpdateEvaluationPropsGeneric<EvaluationDecisionMatrix>) {
        if (this.user.id !== evaluation.responsible) {
            throw new ForbiddenError();
        }

        const template = EvaluationBaseByType[evaluation.type];
        if (questionsSchema(template, false).validate(patch).error || hasDuplicates(patch)) {
            throw new BadRequestError('Invalid id found');
        }

        const {type, ...update} = patch;

        return update;
    }

    private _finish(evaluation: Evaluation & EvaluationDecisionMatrix) {
        if (this.user.id !== evaluation.responsible) {
            throw new ForbiddenError();
        }

        const template = EvaluationBaseByType[evaluation.type];
        if (questionsSchema(template, true).validate(evaluation, {presence: 'required'}).error || hasDuplicates(evaluation)) {
            throw new BadRequestError('evaluation is not ready to finish');
        }

        const emotionalAvg = calculateAverage(evaluation.emotional.answers.map(i => i.value));
        const technicalAvg = calculateAverage(evaluation.technical.answers.map(i => i.value));

        return {
            emotional: {
                ...evaluation.emotional,
                avg: emotionalAvg,
            },
            status: EvaluationStatus.done,
            technical: {
                ...evaluation.technical,
                avg: technicalAvg,
            },
            result: getResultByCoordinates(technicalAvg, emotionalAvg),
            daysLate: computedDaysLate(evaluation.deadline),
            finished_at: moment().utc().toISOString(),
        };
    }

    constructor(
        private repository: EvaluationsRepository,
        private mysql: EvaluationsMysqlRepository,
        private users: UsersService,
        private orgSectors: OrgSectorsService,
        private events: EventsTopicService,
        private account: string,
        private user: AppUser,
    ) {}
}

function questionsSchema(template: DecisionMatrixType, required: boolean) {
    const properties = template.competencies
        .map((competency: {id: string, title: string, text: string}) => ({
            [competency.id]: {
                type: 'object',
                properties: {
                    answers: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    enum: template.questions
                                        .filter(q => q.competency === competency.id)
                                        .map(q => q.id),
                                },
                                value: template.schema,
                            },
                        },
                        minItems: required ? template.questions.filter(q => q.competency === competency.id).length : 0,
                        maxItems: template.questions.filter(q => q.competency === competency.id).length,
                    },
                },
            },
        }))
        .reduce((obj, field) => Object.assign(obj, field), {});

    return Enjoi.schema({
        type: 'object',
        properties,
    }).unknown(true);
}

function hasDuplicates(evaluation: Partial<EvaluationDecisionMatrix>) {
    const answers = [...(evaluation.emotional?.answers || []), ...(evaluation.technical?.answers || [])];
    return some(countBy(answers, 'id'), count => count > 1);
}

export const getResultByCoordinates = (technical: number, emotional: number) => {
    if (isNaN(technical) || isNaN(emotional) ||
        technical < 0 || technical > 10 ||
        emotional < 0 || emotional > 10) {
        console.error('Invalid coords');
        return null;
    }

    if (technical > 9 && emotional > 9) {
        return DecisionMatrixResults.highPerformance;
    } else if (technical > 8 && emotional > 8) {
        return DecisionMatrixResults.investment;
    } else if (technical > 7 && emotional > 7) {
        return DecisionMatrixResults.recognition;
    } else if (technical > 5 && emotional > 5) {
        return DecisionMatrixResults.observation;
    } else if (technical > 5 && emotional <= 5) {
        return DecisionMatrixResults.motivation;
    } else if (technical <= 5 && emotional > 5) {
        return DecisionMatrixResults.training;
    } else if (technical <= 5 && emotional <= 5) {
        return DecisionMatrixResults.resignation;
    }

    return null;
};

const calculateAverage = (arr: Array<number>) => {
    return fixedFloat(arr.reduce((a, b) => a + b, 0) / arr.length);
};
