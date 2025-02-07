import {BarueriConfig} from 'config';
import orderBy from 'lodash/orderBy';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {BadRequestError, NotFoundError} from 'modules/errors/errors';
import {EvaluationTagType, EvaluationType} from 'modules/evaluations/schema';
import EvaluationsService from 'modules/evaluations/service';
import {createTag} from 'modules/evaluations/utils';
import OrgChartsService from 'modules/orgchart/service';
import {AppUser, User} from 'modules/users/schema';
import moment from 'moment';

import EvaluationsSchedulerRepository from './repository';
import {CreateEvaluationsSchedulerProps, EvaluationsScheduler, SCHEDULER_STATUS, UpdateEvaluationsSchedulerProps} from './schema';

export default class EvaluationsSchedulerService {

    static config(cfg: BarueriConfig, user: User, account: string): EvaluationsSchedulerService {
        return new EvaluationsSchedulerService(
            EvaluationsSchedulerRepository.config(cfg, user.id, account),
            OrgChartsService.config(cfg, user, account),
            EvaluationsService.config(cfg, user as AppUser, {id: account} as Account),
            AccountsService.config(cfg, user.id),
            user,
            account,
        );
    }

    async create(sector: string, props: CreateEvaluationsSchedulerProps) {
        const evaluationSchedule = await this.repository.create({
            ...props,
            sector,
            status: SCHEDULER_STATUS.active,
            account: this.account,
        });

        const today = moment();

        const startDayAreToday = moment(today).isSameOrBefore(props.rule.start, 'day');

        if (startDayAreToday && props.type === EvaluationType.decision_matrix) {

            const accountDetails = await this.accounts.retrieve(this.account);
            const thisHour = moment.tz(accountDetails.timezone).startOf('hour');
            const deadline = props.deadline_offset
                ? thisHour.clone().add(props.deadline_offset, 'days').toISOString()
                : null;

            await this.evaluationsService
                .batchCreateOnSector(
                    sector,
                    {
                        tag: createTag(EvaluationTagType.schedule, evaluationSchedule.id),
                        type: props.type,
                        deadline,
                    },
                );
        }

        return evaluationSchedule;
    }

    async retrieve(sector: string, id: string) {
        const scheduler = await this.repository.retrieve(sector, id);

        if (!scheduler) {
            throw new NotFoundError('Scheduler not found');
        }

        return scheduler;
    }

    async listActive() {
        const list = await this.repository.listByStatus(SCHEDULER_STATUS.active);

        return orderBy(list, ['created_at'], ['desc']);
    }

    async listBySector(sector: string, type: EvaluationsScheduler['type']) {
        const list = await this.repository.listBySector(sector, type);

        return orderBy(list, ['created_at'], ['desc']);
    }

    async update(sector: string, id: string, props: UpdateEvaluationsSchedulerProps) {
        const scheduler = await this.retrieve(sector, id);

        if (scheduler.status === SCHEDULER_STATUS.executed) {
            throw new BadRequestError('Cannot update executed scheduler');
        }

        await this.repository.update(scheduler, props);
    }

    async delete(sector: string, id: string) {
        const scheduler = await this.retrieve(sector, id);

        if (scheduler.status === SCHEDULER_STATUS.executed) {
            throw new BadRequestError('Cannot delete executed schedulers');
        }

        await this.repository.delete(sector, id);
    }

    constructor(
        private repository: EvaluationsSchedulerRepository,
        private sectors: OrgChartsService,
        private evaluationsService: EvaluationsService,
        private accounts: AccountsService,
        private user: User,
        private account: string,
    ) {}
}
