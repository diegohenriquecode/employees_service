import {Knex} from 'knex';

export type Pagination = {
    pageSize: number
    page: number
};

export type Ordering = {
    orderBy?: string
    order?: 'ASC' | 'DESC'
};

export type QueryOptions = {
    ordering?: Ordering
    pagination?: Pagination
    projection?: (query: Knex.QueryBuilder) => any
};

export const generatedAsJson = (table: Knex.CreateTableBuilder, columnName: string, type: string, field: string, path: string) => {
    return table.specificType(columnName, `${type} GENERATED ALWAYS AS (${field}->>'$.${path}') STORED`);
};
