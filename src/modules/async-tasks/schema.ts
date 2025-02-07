import {AppUser} from 'modules/users/schema';
import {FileData} from 'utils/storage-service';

export enum AsyncTasksType {
    EXPORT_REPORTS = 'export-reports',
    IMPORT_RANKS = 'import-ranks',
    IMPORT_USERS = 'import-users',
    IMPORT_MANAGERS = 'import-managers',
}

export const AsyncImportsDirectoryPath = {
    [AsyncTasksType.EXPORT_REPORTS]: 'reports',
    [AsyncTasksType.IMPORT_RANKS]: 'ranks-imports',
    [AsyncTasksType.IMPORT_USERS]: 'users-imports',
    [AsyncTasksType.IMPORT_MANAGERS]: 'managers-imports',
};

export const AsyncTasksLambdaFunction = {
    [AsyncTasksType.EXPORT_REPORTS]: 'GenerateAsyncReport',
    [AsyncTasksType.IMPORT_RANKS]: 'NewRanksImport',
    [AsyncTasksType.IMPORT_USERS]: 'NewUsersImport',
    [AsyncTasksType.IMPORT_MANAGERS]: 'NewManagersImport',
};

export enum AsyncTasksStatus {
    CREATED = 'created',
    DONE = 'done',
    ERROR = 'error',
    PROGRESS = 'progress',
}

export type AsyncTasksProps = {
    id: string
    account: string
    employee: string
    fileUrl?: string
    data: string
    type: AsyncTasksType
    status: AsyncTasksStatus
};

export type AsyncTasks = AsyncTasksProps & {
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type ItemType = Record<string, string | undefined | number>;

export type ReportFileProps = {
    headers: string[]
    items: ItemType[]
};

export type AsyncTaskEventMessage = ReportFileProps & {
    id: string
    user: AppUser
    account: string
};

export enum ExportReportsType {
    FEEDBACK = 'feedback',
    DECISION_MATRIX = 'decision-matrix',
    TRAINING = 'training-progress',
    APE = 'ape',
    REPRIMAND = 'reprimand',
    SUSPENSION = 'suspension',
    COACHING_REGISTER = 'coaching-register',
    DISMISS_INTERVIEW = 'dismiss-interview',
    MULTIDIRECTIONAL = 'multidirectional',
}

export type ExportReportsData = {
    type: ExportReportsType,
    query: Record<string, unknown>
};

export type ImportSheetUploadUrlProps = Required<Pick<FileData, 'ContentType' | 'ContentLength' | 'ContentDisposition'>>;

export type ImportItemStatusReport = {
    rowNum: number,
    column?: string,
    rowStatus: AsyncTasksStatus,
    rowStatusMessage: string
};
