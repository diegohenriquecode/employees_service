import {BarueriConfig} from 'config';
import ExcelJS from 'exceljs';
import Mime from 'mime';
import {Account} from 'modules/accounts/schema';
import {BadRequestError} from 'modules/errors/errors';
import EventsTopicService from 'modules/events/event-topic-service';
import {AppUser} from 'modules/users/schema';
import StorageService from 'utils/storage-service';
import {v4 as uuidV4} from 'uuid';
import * as XLSX from 'xlsx';

import AsyncTasksRepository from './repository';
import {AsyncImportsDirectoryPath, AsyncTasks, AsyncTasksLambdaFunction, AsyncTasksStatus, AsyncTasksType, ImportSheetUploadUrlProps, ReportFileProps} from './schema';
import {getAsyncReportFileName, unformattedString} from './utils';

export default class AsyncTasksService {

    static config(cfg: BarueriConfig, user: AppUser, account: string) {
        return new AsyncTasksService(
            AsyncTasksRepository.config(cfg, user, account),
            StorageService.configProtected(cfg),
            EventsTopicService.config(cfg),
            user,
            account,
        );
    }

    async getAsyncTask(reportId: string, toExternal?: boolean) {
        const report = await this.repository.retrieve(reportId);
        return toExternal ? this.toExternal(report) : report;
    }

    async createAsyncReportTask(data: string) {
        const exportReportRegister = await this.repository
            .create({
                type: AsyncTasksType.EXPORT_REPORTS,
                status: AsyncTasksStatus.CREATED,
                data,
            });

        const {ability, ...user} = this.user;

        await this.events.publish(
            'GenerateAsyncReport',
            1,
            'api',
            {user, account: this.account, id: exportReportRegister.id},
            this.account,
        );

        return exportReportRegister;
    }

    async updateTask(currentTask: AsyncTasks, updatedTask: Partial<AsyncTasks>) {
        return this.repository.update(currentTask, updatedTask);
    }

    async generateExportReport(data: ReportFileProps, taskParams: AsyncTasks, account: Account) {
        const {type} = JSON.parse(taskParams.data);
        const Key = `reports/${taskParams.account}/${taskParams.employee}/report_${type}_${taskParams.id}.xlsx`;

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data.items, {
            header: data.headers,
        });

        XLSX.utils.book_append_sheet(workbook, worksheet, taskParams.type);
        const Body = XLSX.write(workbook, {type: 'buffer', bookType: 'xlsx'});
        await this.files
            .putAttachment(Key, Body, getAsyncReportFileName(account, type));

        await this.repository.update(taskParams, {fileUrl: Key, status: AsyncTasksStatus.DONE});
    }

    async getImportSheetUploadUrl({ContentType, ContentLength, ContentDisposition}: ImportSheetUploadUrlProps, type: AsyncTasksType) {
        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${ContentType}`);
        } else if (extension !== 'xlsx' && extension !== 'xls') {
            throw new BadRequestError('Unsupported sheet format');
        }

        const importId = uuidV4();
        const Key = `${AsyncImportsDirectoryPath[type]}/${this.account}/import-file-${importId}.${extension}`;
        return this.files.signedPost(Key, {ContentType, ContentLength, ContentDisposition});
    }

    async confirmImportSheetUpload(filePath: string, type: AsyncTasksType) {
        const [, , fileName] = filePath.split('/');
        if (!fileName.startsWith('import-file-')) {
            console.log('Ignoring doc write');
            return;
        }

        const {ContentType, ContentLength} = await this.files.metadata(filePath, true) || {};

        const extension = Mime.getExtension(ContentType || '');
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${ContentType}`);
        } else if (extension !== 'xlsx' && extension !== 'xls') {
            throw new BadRequestError('Unsupported sheet format');
        } else if (!ContentLength || +ContentLength <= 0) {
            throw new BadRequestError('Empty file');
        }

        const [importId] = fileName.replace('import-file-', '').split('.');
        const asyncTask = await this.repository.create({
            type,
            status: AsyncTasksStatus.CREATED,
            data: '',
            fileUrl: filePath,
        }, importId);

        const {ability, ...user} = this.user;

        await this.events.publish(
            AsyncTasksLambdaFunction[type],
            1,
            'api',
            {user, account: this.account, id: asyncTask.id},
            this.account,
        );

        return asyncTask;
    }

    async readUploadedSheetAsJSON(taskParams: AsyncTasks) {
        const file = await this.files.getObject(taskParams.fileUrl as string);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new Error('Sheet "Dados" not found');
        }

        if (worksheet.actualRowCount <= 1) {
            return {data: [], header: {}};
        }

        const firstRow = worksheet.getRow(1);
        const sheetHeaders: string[] = [];
        const headerText: Record<string, string> = {};
        const data: Record<string, string | number>[] = [];

        Object.values(firstRow.values).forEach((value, index) => {
            const cell = firstRow.getCell(index + 1);
            const cellValue = unformattedString(value?.toString() || '');
            headerText[cellValue] = cell.address[0];
            sheetHeaders[index + 1] = cellValue;
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                return;
            }

            const rowData: Record<string, string> = {};
            row?.values?.forEach((rowItem, index) => {
                rowData[sheetHeaders[index]] = rowItem.text || rowItem.toString();
            });

            data[rowNumber] = {
                ['__rowNum__']: rowNumber,
                ...rowData,
            };
        });

        return {data, header: headerText};
    }

    private async toExternal(asyncTask: AsyncTasks): Promise<AsyncTasks> {
        if (asyncTask.fileUrl) {
            asyncTask.fileUrl = await this.files.signedGetUrl(asyncTask.fileUrl, {Expires: 3600});
        }

        return asyncTask;
    }

    constructor(
        private repository: AsyncTasksRepository,
        private files: StorageService,
        private events: EventsTopicService,
        private user: AppUser,
        private account: string,
    ) { }
}
