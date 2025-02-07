import '@rschedule/moment-date-adapter/setup';
import {Rule} from '@rschedule/core/generators';
import {Context, ScheduledEvent} from 'aws-lambda';
import config from 'config';
import AccountsRepository from 'modules/accounts/repository';
import {ErrorsNotification} from 'modules/errors/errors';
import EvaluationsSchedulerRepository from 'modules/evaluations-scheduler/repository';
import {
    CreateEvaluationProps,
    EvaluationCreateOnSectorEventMessage,
    EvaluationStatus,
    EvaluationTagType,
    EvaluationType,
} from 'modules/evaluations/schema';
import {ApesService} from 'modules/evaluations/service-ape';
import {createTag} from 'modules/evaluations/utils';
import EventsTopicService from 'modules/events/event-topic-service';
import UsersRepository from 'modules/users/repository';
import {User} from 'modules/users/schema';
import moment from 'moment-timezone';

import {SCHEDULER_STATUS} from './schema';

export async function handler(event: ScheduledEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler();
    } catch (e) {
        console.error('error', e);
        await ErrorsNotification.publish(context);
    }
}

async function _handler() {
    const activeAccounts = (await accounts.list())
        .filter(account => !account.disabled);

    for (const account of activeAccounts) {
        const timezone = account.timezone;
        const evaluations = await EvaluationsSchedulerRepository.config(config, '', account.id)
            .listByStatus(SCHEDULER_STATUS.active);

        for (const schedule of evaluations) {
            const {end, frequency, interval, start} = schedule.rule;
            const thisHour = moment.tz(timezone).startOf('hour');

            const today = moment();
            const startDayAreToday = moment(today).isSameOrBefore(start, 'day');

            if (startDayAreToday) {
                continue;
            }

            const parsedStartDateTime = moment(start).tz(timezone).hour(6).minute(0).second(0).millisecond(0);

            const rule = new Rule({
                interval,
                frequency,
                start: parsedStartDateTime,
                end: moment.tz(end, timezone).startOf('hour').add(1, 'second'),
            });

            if (rule.occursOn({date: thisHour})) {
                const user = await UsersRepository.config(config, '', schedule.account)
                    .retrieve(schedule.created_by);

                const deadline = schedule.deadline_offset
                    ? thisHour.clone().add(schedule.deadline_offset, 'days').toISOString()
                    : null;

                const data: EvaluationCreateOnSectorEventMessage = {
                    account: schedule.account,
                    sector: schedule.sector,
                    tag: createTag(EvaluationTagType.schedule, schedule.id),
                    type: schedule.type,
                    deadline,
                    user: user as User,
                };

                if (schedule.type === EvaluationType.ape) {
                    const employeeUser = await UsersRepository.config(config, '', schedule.account)
                        .retrieve(schedule.sector) as User;

                    const apeData: CreateEvaluationProps = {
                        type: schedule.type,
                        employee: schedule.sector,
                        rank: employeeUser.rank,
                        sector: employeeUser.sector,
                        account: schedule.account,
                        status: EvaluationStatus.created,
                        deadline: null,
                    };

                    await ApesService.config(config, user as User, schedule.account).create(employeeUser, apeData);
                } else {
                    await events.publish(
                        'CreateEvaluationOnSector',
                        1,
                        'job',
                        JSON.stringify(data),
                        schedule.account,
                    );
                }

                if (start === end) {
                    await repository.update(schedule, {status: SCHEDULER_STATUS.executed});
                }
            }
        }
    }
}

const accounts = AccountsRepository.config(config, '');
const repository = EvaluationsSchedulerRepository.config(config, 'job', '');
const events = EventsTopicService.config(config);
