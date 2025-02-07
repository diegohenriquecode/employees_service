import {MongoQuery} from '@ucast/mongo';
import {BarueriConfig} from 'config';
import {Knex} from 'knex';
import moment from 'moment';
import {MysqlError} from 'mysql';
import {QueryOptions} from 'utils/mysql';

import fromMango from '../../utils/knex-mango';
import db from '../db';
import {ConflictError} from '../errors/errors';
import {UserHierarchical} from './schema';

export default class UsersHierarchicalMysqlRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new UsersHierarchicalMysqlRepository(
            db,
            cfg.usersHierarchicalMysqlTable,
            user,
            account,
        );
    }

    async create(current: UserHierarchical) {
        try {

            const now = moment();

            await this._db(this.tableName)
                .insert({
                    ...current,
                    created_by: this.user,
                    created_at: now.toISOString(),
                    updated_by: this.user,
                    updated_at: now.toISOString(),
                });
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }

        return current;
    }

    async createArray(items: UserHierarchical[]) {
        try {

            const now = moment();

            await this._db(this.tableName)
                .insert(items.map(item => ({
                    ...item,
                    created_by: this.user,
                    created_at: now.toISOString(),
                    updated_by: this.user,
                    updated_at: now.toISOString(),
                })));
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }
    }

    async update(condition: object, patch: Partial<UserHierarchical>) {

        const now = moment();

        return await this._db(this.tableName)
            .where({...condition, account: this.account})
            .update({
                ...patch,
                updated_by: this.user,
                updated_at: now.toISOString(),
            });
    }

    async delete(condition: object) {
        await this._db(this.tableName)
            .where({...condition, account: this.account})
            .delete();
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

        const result = await query;
        return result;
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

    constructor(
        private _db: Knex,
        private tableName: string,
        private user: string,
        private account: string,
    ) {}
}

export type HierarchicalKey = {
    user_id: string;
    sector: string;
    account: string;
};
