import {MongoQuery} from '@ucast/mongo';
import {BarueriConfig} from 'config';
import {Knex} from 'knex';
import {ConflictError} from 'modules/errors/errors';
import {QueryError} from 'mysql2';

import fromMango from '../../utils/knex-mango';
import {QueryOptions} from '../../utils/mysql';
import db from '../db';
import {TrainingProgress} from './schema';

export default class TrainingProgressesMysqlRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new TrainingProgressesMysqlRepository(
            db,
            cfg.trainingProgressesTable,
            user,
            account,
        );
    }

    async create(progress: TrainingProgress) {
        try {
            await this._db<MysqlTrainingProgress>(this.tableName)
                .insert(mapper.toRepo(progress));
        } catch (e) {
            if ((e as QueryError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError('Duplicated entry');
            }
            throw e;
        }

        return progress;
    }

    async update(current: TrainingProgress, patch: MysqlTrainingProgress) {
        try {
            await this._db<MysqlTrainingProgress>(this.tableName)
                .where({training: current.training, employee: current.employee, account: this.account})
                .update(mapper.toRepo(patch));
        } catch (e) {
            if ((e as QueryError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError('Duplicated entry');
            }
            throw e;
        }

        return {...current, ...patch};
    }

    async retrieve(employee: string, training: string) {
        const result = await this._db<MysqlTrainingProgress>(this.tableName)
            .where({employee, training, account: this.account}).first();

        return mapper.fromRepo(result as MysqlTrainingProgress);
    }

    async count(mangoQuery: MongoQuery) {
        let query = this._db<MysqlTrainingProgress>(this.tableName)
            .count({count: 'training'});

        const where = fromMango(mangoQuery);
        if (where) {
            query = query
                .where(where);
        }

        const result = await query;
        return result[0].count;
    }

    async list(mangoQuery: MongoQuery, options: QueryOptions = {}) {
        let query = this._db<MysqlTrainingProgress>(this.tableName);
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

        if (options.pagination) {
            query = query
                .limit(options.pagination.pageSize)
                .offset(options.pagination.pageSize * options.pagination.page);
        }

        if (options.ordering && options.ordering.orderBy) {
            query = query
                .orderBy(options.ordering.orderBy, options.ordering.order);
        }

        const rows = await query;
        return rows.map(mapper.fromRepo);
    }

    async remove(employee: string, training: string) {
        await this._db(this.tableName)
            .delete()
            .where({employee, training});
    }

    constructor(
        private _db: Knex,
        private tableName: string,
        private user: string,
        private account: string,
    ) {}
}

export type MysqlTrainingProgress = TrainingProgress;

const mapper = {
    toRepo: (progress: TrainingProgress): MysqlTrainingProgress => {
        if (!progress) {
            return progress;
        }

        return {
            ...progress,
            topics: JSON.stringify(progress.topics) as unknown as TrainingProgress['topics'],
        };
    },
    fromRepo: (progress: MysqlTrainingProgress): TrainingProgress => {
        if (!progress) {
            return progress;
        }

        return progress;
    },
};
