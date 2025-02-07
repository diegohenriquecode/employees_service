import cloneDeep from 'lodash/cloneDeep';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

import {InternalError} from '../modules/errors/errors';

const not = {
    '$in': '$nin',
    '$nin': '$in',
    '$or': '$nor',
    '$nor': '$or',
    '$and': '$nand',
    '$nand': '$and',
    '$eq': '$ne',
    '$ne': '$eq',
    '$gt': '$lte',
    '$gte': '$lt',
    '$lt': '$gte',
    '$lte': '$gt',
    '$like': '$nlike',
    '$nlike': '$like',
};

function applyNot(x) {
    return (
        (isArray(x) && notArray(x))
        || (isObject(x) && notObject(x))
        || x
    );
}

function notArray(arr) {
    return arr.map(item => applyNot(item));
}

function notObject(obj) {
    for (const key of Object.keys(obj)) {
        const notKey = not[key];
        const item = obj[notKey] ? merge(obj[notKey], obj[key], notKey, key) : obj[key];
        if (['$nand', '$nor'].includes(key)) {
            obj[notKey || key] = item;
        } else {
            obj[notKey || key] = applyNot(item, false);
        }
        if (notKey) {
            delete obj[key];
        }
    }
    return obj;
}

/**
 * Função para lidar com os conflitos
 */
function merge(a, b, aKey, bKey) {
    return (
        (aKey === '$eq' && a)
        || (bKey === '$eq' && b)
        || (aKey === '$like' && a)
        || (bKey === '$like' && b)
        || isArray(a) && isArray(b) && [...a, ...b]
        // @ToDo: o que fazer em merge de objetos, gte/gt/lte/lt?
    );
}

export function simplifyQuery(mangoQuery = {}) {
    const simplified = cloneDeep(mangoQuery);
    const objs = [simplified];
    while (objs.length) {
        const item = objs.shift();

        if (isArray(item)) {
            for (const obj of item) {
                objs.push(obj);
            }
        } else if (isObject(item)) {
            for (let key of Object.keys(item)) {
                if (['$nand', '$nor'].includes(key)) {
                    item[not[key]] = applyNot(item[key], true);
                    delete item[key];
                    key = not[key];
                }
                objs.push(item[key]);
            }
        } else {
            continue;
        }
    }
    return simplified;
}

export default function fromMango(mangoQuery = {}, prefix) {
    mangoQuery = simplifyQuery(mangoQuery);
    const rootOp = Object.keys(mangoQuery)[0];
    if (!['$and', '$or'].includes(rootOp)) {
        throw new InternalError('Malformed query');
    }
    const clauses = mangoQuery[rootOp];
    if (!Array.isArray(clauses)) {
        throw new InternalError('Malformed query');
    }
    if (clauses.length === 0) {
        return null;
    }
    return Operators[rootOp](clauses, prefix);
}

function build(clause = {}, builder, method, prefix = '') {
    const field = Object.keys(clause)[0];
    if (['$and', '$or'].includes(field)) {
        builder[method](Operators[field](clause[field], prefix));
    } else {
        const op = Object.keys(clause[field])[0];
        const value = clause[field][op];
        if (!(op in Operators)) {
            throw new InternalError(`Unknown operator: ${op}`);
        }
        Operators[op](prefix + field, value, builder, method);
    }
}

const Operators = {
    '$eq': (field, value, builder, method) => value === null
        ? builder[method + 'Null'](field)
        : builder[method](field, '=', value),
    '$ne': (field, value, builder, method) => value === null
        ? builder[method + 'NotNull'](field)
        : (typeof value === 'boolean'
            ? builder[method + 'Raw']('?? is not ?', [field, value])
            : builder[method](field, '<>', value)),
    '$lt': (field, value, builder, method) => builder[method](field, '<', value),
    '$lte': (field, value, builder, method) => builder[method](field, '<=', value),
    '$gt': (field, value, builder, method) => builder[method](field, '>', value),
    '$gte': (field, value, builder, method) => builder[method](field, '>=', value),
    '$in': (field, value, builder, method) => builder[method](field, 'in', value),
    '$nin': (field, value, builder, method) => builder[method](field, 'not in', value),
    '$like': (field, value, builder, method) => builder[method](field, 'like', `%${value}%`),
    '$nlike': (field, value, builder, method) => builder[method](field, 'not like', `%${value}%`),
    '$exists': (field, value, builder, method) => value
        ? builder[method + 'NotNull'](field)
        : builder[method + 'Null'](field),
    '$and': (value, prefix) => {
        return (builder) => {
            for (const clause of value) {
                build(clause, builder, 'where', prefix);
            }
        };
    },
    '$or': (value, prefix) => {
        return (builder) => {
            for (const clause of value) {
                build(clause, builder, 'orWhere', prefix);
            }
        };
    },
};
