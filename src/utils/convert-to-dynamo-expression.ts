import {MongoQuery} from '@ucast/mongo';
import {BadRequestError} from 'modules/errors/errors';
import {FilterQueryType} from 'modules/timelines/schema';

export default function buildFilterQuery(filter: MongoQuery): FilterQueryType {
    const filterQuery: FilterQueryType = {
        expression: '',
        names: {},
        values: {},
    };

    if (Object.keys(filter).length > 1) {
        throw new BadRequestError('The Filter object must not have more than one key!');
    }

    if (filter['$and']) {
        const combinedExpressions: string[] = [];

        filter['$and'].forEach((cond: {[x: string]: {[x: string]: string | string[];};}, index: unknown) => {
            const key = Object.keys(cond)[0];
            const operation = Object.keys(cond[key])[0];
            const valueKey = `:${key}${index}`;
            const valueObj: Record<string, string> = {};

            switch (operation) {
            case '$eq':
                combinedExpressions.push(`#${key} = ${valueKey}`);
                filterQuery.names[`#${key}`] = key;
                filterQuery.values[valueKey] = cond[key][operation] as string;
                break;
            case '$ne':
                combinedExpressions.push(`#${key} <> ${valueKey}`);
                filterQuery.names[`#${key}`] = key;
                filterQuery.values[valueKey] = cond[key][operation] as string;
                break;
            case '$in':
                (cond[key][operation] as string[]).forEach((value, idx) => {
                    const arrayValueKey = `:${key}${index}${idx}`;
                    valueObj[arrayValueKey] = value;
                    filterQuery.values[arrayValueKey] = value;
                });
                combinedExpressions.push(`#${key} in (${Object.keys(valueObj).toString()})`);
                filterQuery.names[`#${key}`] = key;
                break;
            default:
                throw new BadRequestError(`Operation '${operation}' not supported.`);
            }

        });

        filterQuery.expression = combinedExpressions.join(' AND ');

    }

    return filterQuery;
}

interface UpdateExpressionInput {
    set?: Record<string, unknown>,
    remove?: Record<string, undefined>,
}

export function updateExpression(input: UpdateExpressionInput) {
    const result = {
        UpdateExpression: '',
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {},
    };
    if (input.set) {
        const subExpressions = Object.keys(input.set)
            .map(fieldName => combinedExpression(fieldName, input.set?.[fieldName]));
        result.UpdateExpression = `SET ${subExpressions.map(e => e.UpdateExpression).join(', ')}`;
        Object.assign(result.ExpressionAttributeNames, ...subExpressions.map(e => e.ExpressionAttributeNames));
        Object.assign(result.ExpressionAttributeValues, ...subExpressions.map(e => e.ExpressionAttributeValues));
    }
    if (input.remove) {
        const subExpressions = Object.keys(input.remove)
            .map(fieldName => combinedExpression(fieldName));
        result.UpdateExpression = (result.UpdateExpression ? `${result.UpdateExpression} ` : '') + `REMOVE ${subExpressions.map(e => e.UpdateExpression).join(', ')}`;
        Object.assign(result.ExpressionAttributeNames, ...subExpressions.map(e => e.ExpressionAttributeNames));
    }
    return result;
}

function combinedExpression(fieldName: string, fieldValue?: unknown) {
    if (fieldValue === undefined) {
        return {
            UpdateExpression: `#${fieldName.replaceAll('-', '_').split('.').join('.#')}`,
            ExpressionAttributeNames: {...Object.fromEntries(fieldName.split('.').map(f => [`#${f.replaceAll('-', '_')}`, f]))},
            ExpressionAttributeValues: {},
        };
    }

    const valueKey = fieldName.replaceAll('-', '_').replaceAll('.', '_');
    return {
        UpdateExpression: `#${fieldName.replaceAll('-', '_').split('.').join('.#')} = :${valueKey}`,
        ExpressionAttributeNames: {...Object.fromEntries(fieldName.split('.').map(f => [`#${f.replaceAll('-', '_')}`, f]))},
        ExpressionAttributeValues: {[`:${valueKey}`]: fieldValue},
    };
}
