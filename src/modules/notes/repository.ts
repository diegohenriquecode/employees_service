import {MongoQuery} from '@ucast/mongo';
import {BarueriConfig} from 'config';
import {Knex} from 'knex';
import moment from 'moment';
import {MysqlError} from 'mysql';
import {v4 as uuid} from 'uuid';

import fromMango from '../../utils/knex-mango';
import db from '../db';
import {ConflictError} from '../errors/errors';
import {Note} from './schema';

export default class NotesRepository {
    static config(cfg: BarueriConfig, userId: string) {
        return new NotesRepository(
            db,
            cfg.notesTable,
            userId,
        );
    }

    async create(note: Partial<Note>) {
        const now = moment().toISOString();
        note = {
            ...note,
            id: uuid(),
            created_at: now,
            created_by: this.userId,
            updated_at: now,
            updated_by: this.userId,
        };
        try {
            await this._db(this.tableName)
                .insert(mapper.to(note));
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }

        return note;
    }

    async retrieve(id: string) {
        const result = await this._db(this.tableName)
            .where({id})
            .select();
        return mapper.from(result);
    }

    async count(mangoQuery: Record<string, unknown>) {
        let query = this._db(this.tableName)
            .count({count: 'id'});

        const where = fromMango(mangoQuery);
        if (where) {
            query = query
                .where(where);
        }

        const result = await query;
        return result[0].count;
    }

    async list(mangoQuery: MongoQuery, options: NotesQueryOptions = {}) {
        let query = this._db(this.tableName);
        if (options.projection) {
            query = options
                .projection(query);
        } else {
            query = query.select('*');
        }

        const where = fromMango(mangoQuery);
        if (where) {
            query = query
                .where(where);
        }

        if (options.ordering) {
            query = query.orderBy(options.ordering.orderBy, options.ordering.order);
        }
        if (options.pagination) {
            query = query
                .limit(options.pagination.pageSize)
                .offset(options.pagination.pageSize * (options.pagination.page || 0));
        }
        const result = await query;
        return result.map(mapper.from) as Note[];
    }

    constructor(
        private _db: Knex,
        private tableName: string,
        private userId: string,
    ) {}
}

const mapper = {
    to: (item: any) => {
        if (!item) {
            return item;
        }

        return {
            ...item,
        };
    },
    from: (row: any) => {
        if (!row) {
            return row;
        }

        return {
            ...row,
        };
    },
};

type Pagination = {
    pageSize: number
    page: number
};

type Ordering = {
    orderBy: string
    order?: string
};

export type NotesQueryOptions = {
    ordering?: Ordering
    pagination?: Pagination
    projection?: (query: Knex.QueryBuilder) => Knex.QueryBuilder
};
