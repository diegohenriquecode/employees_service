import {MongoQuery} from '@ucast/mongo';
import {BarueriConfig} from 'config';
import {Knex} from 'knex';
import omit from 'lodash/omit';
import {MysqlError} from 'mysql';

import fromMango from '../../utils/knex-mango';
import db from '../db';
import {ConflictError} from '../errors/errors';
import {Evaluation} from './schema';

export default class EvaluationsMysqlRepository {
    static config(cfg: BarueriConfig) {
        return new EvaluationsMysqlRepository(
            db,
            cfg.evaluationsMysqlTable,
        );
    }

    async create(evaluation: Evaluation) {
        try {
            await this._db(this.tableName)
                .insert(EvaluationDbMapper.to(evaluation));
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }

        return evaluation;
    }

    async update(current: Evaluation, patch: Partial<Evaluation>) {
        try {
            await this._db(this.tableName)
                .where({id: current.id, account: current.account})
                .update(EvaluationDbMapper.to(patch));
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

    list = async (mangoQuery: Record<string, unknown>, options: QueryOptions = {}) => {
        let query = this._db(this.tableName);
        query = query.select('*');

        const where = fromMango(mangoQuery);
        if (where) {
            query = query
                .where(where);
        }

        let total;
        if (options.count) {
            const countRes = await query
                .clone()
                .clearSelect()
                .count({count: 'id'});
            total = countRes[0].count;
        }

        if (options.ordering) {
            query = query.orderBy(options.ordering.orderBy, options.ordering.order);
        }

        if (options.pagination) {
            query = query
                .limit(options.pagination.pageSize)
                .offset(options.pagination.pageSize * options.pagination.page);
        }

        const result = await query;
        const items = result.map(EvaluationDbMapper.from) as Evaluation[];
        return {items, total};
    };

    async countByStatus(mangoQuery: Record<string, unknown>) {
        let query = this._db(this.tableName);
        query = query.select('*');

        const where = fromMango(mangoQuery);
        if (where) {
            query = query
                .where(where);
        }

        const rows = await query
            .clone()
            .clearSelect()
            .select('status', this._db.raw('count(status) as count'))
            .groupBy('status');

        return rows
            .map(({status, count}) => ({[status]: count}))
            .reduce((obj, field) => Object.assign(obj, field), {});
    }

    listByLast = async (mangoQuery: Record<string, unknown>, options: QueryOptions = {}) => {
        let query = this._db(`${this.tableName} as table1`);
        query = query.select('table1.*');

        query.leftJoin('BarueriEvaluations as table2', function () {
            this
                .on('table1.status', '=', 'table2.status')
                .on('table1.type', '=', 'table2.type')
                .on('table1.employee', '=', 'table2.employee')
                .on('table1.created_at', '<', 'table2.created_at');
        });

        query = query.where({'table2.created_at': null});

        const where = fromMango(mangoQuery, 'table1.');
        if (where) {
            query = query
                .where(where);
        }

        let total;
        if (options.count) {
            const countRes = await query
                .clone()
                .clearSelect()
                .count({count: 'table1.id'});
            total = countRes[0].count;
        }

        if (options.pagination) {
            query = query
                .limit(options.pagination.pageSize)
                .offset(options.pagination.pageSize * options.pagination.page);
        }

        const result = await query;
        const items = result.map(EvaluationDbMapper.from) as Evaluation[];
        return {items, total};
    };

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
    count?: boolean
    ordering?: Ordering
    pagination?: Pagination
};

class EvaluationDbMapper {
    static from(row: any) {
        if (!row) {
            return row;
        }

        const {...item} = row;

        return {
            ...item,
        } as Evaluation;
    }

    static to(item: Partial<Evaluation>) {
        if (!item) {
            return item;
        }

        return omit({...item, result: JSON.stringify(item.result)}, [
            '_employee_id',
            'emotional',
            'technical',
            'criteria',
            'observations',
            'evaluations',
            'rev',
        ]);
    }
}
