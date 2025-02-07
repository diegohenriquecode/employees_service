import {MongoQuery} from '@ucast/mongo';
import {BarueriConfig} from 'config';
import {Knex} from 'knex';
import {MysqlError} from 'mysql';

import fromMango from '../../utils/knex-mango';
import db from '../db';
import {ConflictError} from '../errors/errors';
import FeedbackDbMapper from './mapper';
import {Feedback} from './schema';

export default class FeedbacksMysqlRepository {
    static config(cfg: BarueriConfig) {
        return new FeedbacksMysqlRepository(
            db,
            cfg.feedbacksMysqlTable,
        );
    }

    async create(feedback: Feedback) {
        try {
            await this._db(this.tableName)
                .insert(FeedbackDbMapper.to(feedback));
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }

        return feedback;
    }

    async update(current: Feedback, patch: Partial<Feedback>) {
        try {
            await this._db(this.tableName)
                .where({id: current.id, account: current.account})
                .update(FeedbackDbMapper.to(patch));
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }

        return {
            ...current,
            ...patch,
        };
    }

    async count(mangoQuery: MongoQuery) {
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

    async list(mangoQuery: MongoQuery, options: QueryOptions = {}) {
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

        if (options.ordering && options.ordering.orderBy) {
            query = query.orderBy(options.ordering.orderBy, options.ordering.order);
        }

        if (options.pagination) {
            query = query
                .limit(options.pagination.pageSize)
                .offset(options.pagination.pageSize * options.pagination.page);
        }
        const result = await query;
        return result.map(FeedbackDbMapper.from) as Feedback[];
    }

    async retrieve(mangoQuery: MongoQuery) {
        let query = this._db(this.tableName);

        const where = fromMango(mangoQuery);
        if (where) {
            query = query
                .where(where);
        }

        return await query.first();
    }

    async remove(id: string) {
        await this._db(this.tableName).delete().where({id});
    }

    constructor(
        private _db: Knex,
        private tableName: string,
    ) {}
}

type Pagination = {
    pageSize: number
    page: number
};

type Ordering = {
    orderBy?: string
    order?: string
};

type QueryOptions = {
    ordering?: Ordering
    pagination?: Pagination
    projection?: (query: Knex.QueryBuilder) => any
};
