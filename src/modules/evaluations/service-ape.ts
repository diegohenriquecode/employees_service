import {BarueriConfig} from 'config';
import Enjoi from 'enjoi';
import countBy from 'lodash/countBy';
import some from 'lodash/some';
import {BadRequestError, ForbiddenError} from 'modules/errors/errors';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import {APEEvaluation, APEEvaluationType, EvaluationBaseByType} from './bases';
import EvaluationsRepository from './repository';
import {
    CreateEvaluationProps,
    Evaluation,
    EvaluationAPE,
    EvaluationService,
    EvaluationStatus,
    EvaluationTypes,
    UpdateEvaluationProps,
} from './schema';
import {computedDaysLate} from './utils';

export class ApesService implements EvaluationService {

    static config(cfg: BarueriConfig, user: User, account: string): ApesService {
        return new ApesService(
            EvaluationsRepository.config(cfg, user.id, account),
            UsersService.config(cfg, user, account),
            user,
        );
    }

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
                criteria: {answers: []},
                observations: '',
            });
    }

    async retrieve(evaluation: Evaluation) {
        return evaluation;
    }

    async update(evaluation: Evaluation & EvaluationAPE, patch: UpdateEvaluationProps) {
        const update = this._update(evaluation, patch);

        return this.repository.update(evaluation, update);
    }

    private _update(evaluation: Evaluation & EvaluationAPE, patch: UpdateEvaluationProps) {
        if (this.user.id !== evaluation.responsible) {
            throw new ForbiddenError();
        }

        if (
            questionsSchema(EvaluationBaseByType[evaluation.type]).validate(evaluationAnswers(patch)).error
            || hasDuplicates(patch)
        ) {
            throw new BadRequestError('Invalid id found');
        }

        const {type, ...update} = patch;

        return update;
    }

    async finish(evaluation: Evaluation & EvaluationAPE) {
        if (this.user.id !== evaluation.responsible) {
            throw new ForbiddenError();
        }

        const update: Pick<Evaluation, 'status' | 'daysLate' | 'finished_at'> & Omit<EvaluationTypes, 'type'> = this._finish(evaluation as EvaluationAPE);

        update.daysLate = computedDaysLate(evaluation.deadline);

        update.finished_at = moment()
            .utc()
            .toISOString();

        return await this.repository.update(evaluation, update);
    }

    private _finish(evaluation: EvaluationAPE): Pick<Evaluation, 'status' | 'result'> & Pick<EvaluationAPE, 'criteria' | 'observations'> {
        if (
            questionsSchema(EvaluationBaseByType[evaluation.type]).validate(evaluationAnswers(evaluation), {presence: 'required'}).error
            || hasDuplicates(evaluation)
        ) {
            throw new BadRequestError('evaluation is not ready to finish');
        }

        return {
            status: EvaluationStatus.done,
            criteria: evaluation.criteria,
            observations: evaluation.observations,
            result: evaluation.criteria.answers.reduce((acc, answer) => acc + answer.value, 0),
        };
    }

    constructor(
        private repository: EvaluationsRepository,
        private users: UsersService,
        private user: User,
    ) {}
}

function questionsSchema(template: APEEvaluationType) {
    return Enjoi.schema({
        type: 'object',
        properties: template.questions
            .reduce((obj, item) => ({...obj, [item.id]: template.schema}), {}),
    }).unknown(true);
}

function evaluationAnswers(evaluation: EvaluationAPE) {
    return (evaluation.criteria?.answers || [])
        .reduce((obj, item) => ({...obj, [item.id]: item.value}), {});
}

function hasDuplicates(evaluation: EvaluationAPE) {
    const answers = (evaluation.criteria?.answers || []);
    return (
        some(countBy(answers, 'id'), count => count > 1) ||
        answers.some(({id}) => !APEEvaluation[0].questions.map(q => q.id).includes(id))
    );
}
