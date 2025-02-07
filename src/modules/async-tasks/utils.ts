import i18n from 'i18n';
import {Account} from 'modules/accounts/schema';
import {RankFieldsNameMap} from 'modules/ranks/sub_import';
import {fieldsNameMap} from 'modules/users/import';
import moment from 'moment';

import {AsyncTasksStatus, ExportReportsType, ImportItemStatusReport, ItemType} from './schema';

export const getFormattedDate = (date: string | undefined) => {
    return moment(date).format('DD/MM/YYYY');
};

export const getFormattedDateAndHour = (date: string | undefined) => {
    return moment(date).format('DD/MM/YYYY - HH:mm');
};

export const mapper = (account: Account, type: ExportReportsType, itemArray: ItemType[]) => {
    const t = (key: string) => i18n(account.lang)(key);
    const translateValue = (value: string | number | undefined) => {
        if (typeof value === 'string' && value.includes('report.')) {
            return t(value);
        }
        return value;
    };

    return itemArray.map(item => {
        const mappeditem: ItemType = {};
        Object.keys(item).forEach(key => {
            mappeditem[t(`report.${type}.${key}`)] = translateValue(item[key]);
        });
        return mappeditem;
    });
};

export const getAsyncReportFileName = (account: Account, type: ExportReportsType) => {
    return i18n(account.lang)(`report.${type}.filename`);
};

export const unformattedString = (str: string) => {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
};

export const setUserImportItemColumn = (item: ImportItemStatusReport, header: Record<string, string>) => {
    if (item.rowStatus === AsyncTasksStatus.ERROR) {
        if (item.rowStatusMessage.includes('validation_error')) {
            const column = Object.keys(fieldsNameMap).find(field => item.rowStatusMessage.includes(field));
            if (column) {
                item.column = header[unformattedString(fieldsNameMap[column])];
                item.rowStatusMessage = `invalid_${column}`;
                return item;
            }
        }

        switch (item.rowStatusMessage) {
        case 'unknown_role':
            item.column = header[unformattedString(fieldsNameMap.roles)];
            return item;
        case 'unknown_rank':
            item.column = header[unformattedString(fieldsNameMap.rank)];
            return item;
        case 'unknown_sector':
            item.column = header[unformattedString(fieldsNameMap.sector)];
            return item;
        case 'duplicated_email':
            item.column = header[unformattedString(fieldsNameMap.email)];
            return item;
        case 'duplicated_phone':
            item.column = header[unformattedString(fieldsNameMap.mobile_phone)];
            return item;
        case 'duplicated_username':
            item.column = header[unformattedString(fieldsNameMap.username)];
            return item;
        default:
            return item;
        }
    } else {
        return item;
    }
};

export const setRankImportItemColumn = (item: ImportItemStatusReport, header: Record<string, string>) => {
    if (item.rowStatus === AsyncTasksStatus.ERROR) {
        if (item.rowStatusMessage.includes('validation_error')) {
            const column = Object.keys(RankFieldsNameMap).find(field => item.rowStatusMessage.includes(field));
            if (column) {
                item.column = header[unformattedString(RankFieldsNameMap[column])];
                item.rowStatusMessage = `invalid_${column}`;
                return item;
            }
        }

        switch (item.rowStatusMessage) {
        case 'duplicated_rank':
            item.column = header[unformattedString(RankFieldsNameMap.title)];
            return item;
        default:
            return item;
        }
    } else {
        return item;
    }
};
