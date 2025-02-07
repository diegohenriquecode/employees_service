import {CreateRankSchema} from 'api/app/ranks/schema';
import {Context, SNSMessage, SQSEvent} from 'aws-lambda';
import config from 'config';
import compact from 'lodash/compact';
import {AsyncTasksStatus, AsyncTaskEventMessage} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {setRankImportItemColumn, unformattedString} from 'modules/async-tasks/utils';
import {BadRequestError, ConflictError, ErrorsNotification, NotFoundError, UnprocessableEntity, ValidationError} from 'modules/errors/errors';
import RanksService from 'modules/ranks/service';
import {AppUser} from 'modules/users/schema';
import QueueService from 'utils/queues';

import {HierarchicalLevel} from './schema';

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
            data: ranksDataFromSheet,
            header,
        } = await asyncTasksService.readUploadedSheetAsJSON(asyncTask);
        await asyncTasksService.updateTask(asyncTask, {status: AsyncTasksStatus.PROGRESS, data: ''});
        const dataWithoutColumns = await batchCreateRanks(ranksDataFromSheet, user, accountId);
        const data = JSON.stringify(
            compact(dataWithoutColumns.map(item => setRankImportItemColumn(item, header))),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function batchCreateRanks(rows: any[], user: AppUser, account: string) {
    const ranksService = await RanksService.config(config, user, account);

    for (const row of rows) {
        if (!row) {
            continue;
        }

        const index = row['__rowNum__'];
        const item = convertRankSheetRow(rows[index]);

        if (item.rowStatus === AsyncTasksStatus.DONE) {
            continue;
        }

        try {
            const {rowNum, rowStatus, rowStatusMessage, ...rankData} = item;
            try {
                const result = CreateRankSchema.validate(rankData, {abortEarly: false, presence: 'required'});
                if (result.error) {
                    const details = result.error.details.map(d => d.message);
                    throw new ValidationError('Validation error', details);
                }

                const createdRank = await ranksService.create(result.value);

                if (createdRank && createdRank.id) {
                    item.rowStatus = AsyncTasksStatus.DONE;
                    item.rowStatusMessage = createdRank.id;
                } else {
                    item.rowStatus = AsyncTasksStatus.ERROR;
                    item.rowStatusMessage = 'unexpected_error';
                }
            } catch (error: ConflictError | unknown) {
                if (error instanceof ConflictError) {
                    throw new BadRequestError('duplicated_rank');
                }
                throw error;
            }
        } catch (error: unknown) {
            item.rowStatus = AsyncTasksStatus.ERROR;
            if (error instanceof BadRequestError) {
                item.rowStatusMessage = error.message;
            } else if (error instanceof ValidationError) {
                item.rowStatusMessage = 'validation_error: ' + error.details[0];
            } else {
                item.rowStatusMessage = 'unexpected_error';
            }
        } finally {
            rows[index] = item;
        }
    }

    return rows.map((item: RankSheetItem) => ({
        rowNum: item.rowNum,
        rowStatus: item.rowStatus,
        rowStatusMessage: item.rowStatusMessage,
    }));
}

const queues = QueueService.config(config);

export const RankFieldsNameMap = {
    'title': 'TÍTULO',
    'description': 'DESCRIÇÃO',
    'hierarchical_level': 'NÍVEL HIERÁRQUICO',
    'responsibilities': 'RESPONSABILIDADES',
    'requirements': 'REQUISITOS',
    'desired': 'DESEJÁVEL',
};

const HierarchicalLevelMap = {
    'presidencia': HierarchicalLevel.Presidency,
    'diretoria': HierarchicalLevel.Director,
    'gerencia': HierarchicalLevel.Management,
    'supervisao': HierarchicalLevel.Supervision,
    'operacional': HierarchicalLevel.Operational,
};

export type RankSheetItem = {
    rowNum: number,
    title: string,
    description: string,
    rowStatus: AsyncTasksStatus,
    rowStatusMessage: string,
};

export const convertRankSheetRow = (rawRow: Record<string, string>) => {
    const item: Record<string, string> = {};
    const row: Record<string, string> = {};
    Object.keys(rawRow).forEach(key => {
        row[unformattedString(key)] = rawRow[key];
    });
    Object.entries(RankFieldsNameMap).forEach(([key, value]) => {
        if (key === 'hierarchical_level') {
            item[unformattedString(key)] = HierarchicalLevelMap[unformattedString(row[unformattedString(value)])?.toString() as keyof typeof HierarchicalLevelMap];
        } else {
            item[unformattedString(key)] = row[unformattedString(value)]?.toString();
        }
    });

    return {
        rowNum: parseInt(rawRow['__rowNum__']),
        title: item['title'],
        description: item['description'],
        responsibilities: item['responsibilities'],
        requirements: item['requirements'],
        desired: item['desired'],
        hierarchical_level: item['hierarchical_level'],
        rowStatus: AsyncTasksStatus.PROGRESS,
        rowStatusMessage: '',
    } as RankSheetItem;
};
