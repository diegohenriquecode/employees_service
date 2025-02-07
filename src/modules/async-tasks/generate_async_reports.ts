import {Context, SNSMessage, SQSEvent} from 'aws-lambda';
import config from 'config';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import DismissInterviewsService from 'modules/dismiss-interviews/service';
import {BadRequestError, ErrorsNotification, NotFoundError, UnprocessableEntity} from 'modules/errors/errors';
import EvaluationsService from 'modules/evaluations/service';
import FeedbacksService from 'modules/feedbacks/service';
import ReprimandsService from 'modules/reprimands/service';
import TrainingProgressesService from 'modules/training-progresses/service';
import {AppUser} from 'modules/users/schema';
import QueueService from 'utils/queues';

import CoachingRegistersService from '../coaching-registers/service';
import SuspensionsService from '../suspensions/service';
import {AsyncTasks, AsyncTasksStatus, ExportReportsData, ExportReportsType, AsyncTaskEventMessage, ItemType} from './schema';
import AsyncTasksService from './service';

export async function handler(event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event);
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
    }
}

async function _handler(event: SQSEvent) {
    for (const record of event.Records) {
        await recordHandler(record);
        await queues.deleteMessage(record);
    }
}

async function recordHandler(record: SQSEvent['Records'][0]) {
    const {Message} = JSON.parse(record.body) as SNSMessage;
    const {user, account: accountId, id: reportId} =
        JSON.parse(Message) as AsyncTaskEventMessage;

    const asyncTasksService = AsyncTasksService.config(config, user, accountId);
    const account = await AccountsService.config(config, user.id)
        .retrieve(user.account);
    const report = await asyncTasksService.getAsyncTask(reportId);

    try {
        const items: ItemType[] = await generateAsyncReportBody(user, account, report);
        const headers = items.length ? Object.keys(items[0]) : [];
        await asyncTasksService.generateExportReport({items, headers}, report, account);
    } catch (error) {
        await asyncTasksService.updateTask(report, {status: AsyncTasksStatus.ERROR});
        if (error instanceof UnprocessableEntity || error instanceof BadRequestError || error instanceof NotFoundError) {
            console.warn(error.message, Message);
        } else {
            throw error;
        }
    }
}

async function generateAsyncReportBody(user: AppUser, account: Account, report: AsyncTasks) {
    const {type, query}: ExportReportsData = JSON.parse(report.data);
    switch (type) {
    case ExportReportsType.FEEDBACK:
        return FeedbacksService.config(config, user, account.id)
            .generateAsyncReportBody(query, account);
    case ExportReportsType.DECISION_MATRIX:
        return EvaluationsService.config(config, user, account)
            .decisionMatrixGenerateAsyncReportBody(query, account);
    case ExportReportsType.TRAINING:
        return TrainingProgressesService.config(config, user, account.id)
            .generateAsyncReportBody(query, account);
    case ExportReportsType.APE:
        return EvaluationsService.config(config, user, account)
            .apeGenerateAsyncReportBody(query, account);
    case ExportReportsType.REPRIMAND:
        return ReprimandsService.config(config, user, account)
            .generateAsyncReportBody(query, account);
    case ExportReportsType.SUSPENSION:
        return SuspensionsService.config(config, user, account)
            .generateAsyncReportBody(query, account);
    case ExportReportsType.COACHING_REGISTER:
        return CoachingRegistersService.config(config, user, account.id)
            .generateAsyncReportBody(query, account);
    case ExportReportsType.DISMISS_INTERVIEW:
        return DismissInterviewsService.config(config, user, account.id)
            .generateAsyncReportBody(query, account);
    case ExportReportsType.MULTIDIRECTIONAL:
        return EvaluationsService.config(config, user, account)
            .multidirectionalGenerateAsyncReportBody(query, account);
    default:
        throw new BadRequestError(`Unknown report type: ${type}`);
    }
}

const queues = QueueService.config(config);
