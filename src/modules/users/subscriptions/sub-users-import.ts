import {Context, SNSMessage, SQSEvent} from 'aws-lambda';
import config from 'config';
import compact from 'lodash/compact';
import {AsyncTasksStatus, AsyncTaskEventMessage} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {setUserImportItemColumn} from 'modules/async-tasks/utils';
import {BadRequestError, ErrorsNotification, NotFoundError, UnprocessableEntity} from 'modules/errors/errors';
import QueueService from 'utils/queues';

import UsersImport from '../import';

export async function handler(event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event);
    } catch (e) {
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
    const {user, account: accountId, id: asyncTaskId} =
        JSON.parse(Message) as AsyncTaskEventMessage;

    const asyncTasksService = AsyncTasksService.config(config, user, accountId);
    const asyncTask = await asyncTasksService.getAsyncTask(asyncTaskId);

    try {
        const {
            data: usersDataFromSheet,
            header,
        } = await asyncTasksService.readUploadedSheetAsJSON(asyncTask);
        await asyncTasksService.updateTask(asyncTask, {status: AsyncTasksStatus.PROGRESS, data: ''});

        const dataWithoutColumns = await UsersImport.config(config, user, accountId)
            .batchCreateUsers(usersDataFromSheet);

        const data = JSON.stringify(
            compact(dataWithoutColumns.map(item => setUserImportItemColumn(item, header))),
        );
        await asyncTasksService.updateTask(asyncTask, {status: AsyncTasksStatus.DONE, data});
    } catch (error) {
        console.error(error);
        await asyncTasksService.updateTask(asyncTask, {status: AsyncTasksStatus.ERROR, data: JSON.stringify(error)});
        if (error instanceof UnprocessableEntity || error instanceof BadRequestError || error instanceof NotFoundError) {
            console.warn(error.message, Message);
        } else {
            throw error;
        }
    }
}

const queues = QueueService.config(config);
