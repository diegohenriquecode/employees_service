import {MongoQuery} from '@ucast/mongo';
import {BarueriConfig} from 'config';
import {Knex} from 'knex';
import {isEqual} from 'lodash';
import {MysqlError} from 'mysql';

import fromMango from '../../utils/knex-mango';
import db from '../db';
import {ConflictError} from '../errors/errors';
import {OrderByRaw, Relation, RelationDelete, RelationSector, User} from './schema';

export default class UsersMysqlRepository {
    static config(cfg: BarueriConfig) {
        return new UsersMysqlRepository(
            db,
            cfg.usersMysqlTable,
            cfg.usersSectorsTable,
        );
    }

    async create(user: User) {
        const {sectors, ...newUser} = user;
        try {
            await this._db(this.tableName)
                .insert(mapper.to(newUser));

            await this.insertRelation(user.id, user.account, user.sector, user.sectors);
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }

        return user;
    }

    async update(current: User, patch: Partial<User>) {
        const {sectors: new_sectors, ...restPatch} = patch;
        const {sectors: old_sectors, ...restCurrent} = current;

        try {
            patch = filledWithNull(restCurrent, restPatch);
            await this._db(this.tableName)
                .where({id: current.id, account: current.account})
                .update(mapper.to(patch));

            if (new_sectors && !isEqual(old_sectors, new_sectors)) {
                await this.modifyRelation(current, current.account, new_sectors, old_sectors);
            }

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

    async count(mangoQuery: Record<string, unknown>, relationsQuery?: Record<string, unknown>) {
        let query = this._db(this.tableName)
            .count({count: 'id'});

        const relationsWhere = relationsQuery && fromMango(relationsQuery, `${this.relationTableName}.`);
        if (relationsWhere) {
            const {tableName, relationTableName} = this;
            query.leftJoin(this.relationTableName, function () {
                this
                    .on(`${tableName}.account`, '=', `${relationTableName}.account`)
                    .andOn(`${tableName}.id`, '=', `${relationTableName}.user`);
            }).where(relationsWhere);
        }

        const where = fromMango(mangoQuery, `${this.tableName}.`);
        if (where) {
            query = query
                .where(where);
        }

        const result = await query;
        return result[0].count;
    }

    async countDisabled(mangoQuery: Record<string, unknown>) {
        let query = this._db(this.tableName)
            .count({created: 'id'})
            .sum({disabled: 'disabled'});

        const where = fromMango(mangoQuery);
        if (where) {
            query = query
                .where(where);
        }

        const [{created, disabled}] = await query;

        return {
            created: typeof created === 'string' ? parseInt(created || '0') : (created || 0),
            disabled: parseInt(disabled || '0'),
        };
    }

    async list(mangoQuery: MongoQuery, options: UsersMysqlQueryOptions = {}, relationsQuery?: Record<string, unknown>) {
        let query = this._db(this.tableName);

        if (options.projection) {
            query = options
                .projection(query);
        } else {
            query = query.select(`${this.tableName}.*`);
        }

        const relationsWhere = relationsQuery && fromMango(relationsQuery, `${this.relationTableName}.`);
        if (relationsWhere) {
            const {tableName, relationTableName} = this;
            query.leftJoin(this.relationTableName, function () {
                this
                    .on(`${tableName}.account`, '=', `${relationTableName}.account`)
                    .andOn(`${tableName}.id`, '=', `${relationTableName}.user`);
            }).where(relationsWhere);
            query = query.select(`${this.relationTableName}.sector as sector`);
        }

        const where = fromMango(mangoQuery, `${this.tableName}.`);
        if (where) {
            query = query
                .where(where);
        }

        if (options.ordering) {
            query = query.orderBy(options.ordering.orderBy, options.ordering.order);
        } else if (options.orderingRaw) {
            if (options.managerFirst) {
                query.orderByRaw(`FIELD(${this.relationTableName}.${options.orderingRaw.field}, ${options.orderingRaw.expression}), is_manager desc`);
            } else {
                query.orderByRaw(`FIELD(${this.relationTableName}.${options.orderingRaw.field}, ${options.orderingRaw.expression})`);
            }
        }

        if (options.pagination) {
            query = query
                .limit(options.pagination.pageSize)
                .offset(options.pagination.pageSize * (options.pagination.page || 0));
        }

        const result = await query;
        return result
            .map(mapper.from) as User[];
    }

    async listRelations(mangoQuery: MongoQuery, options: UsersMysqlQueryOptions = {}) {
        let query = this._db(this.relationTableName);
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

    async remove(id: string, account: string) {
        await this._db(this.tableName).delete().where({id, account});
        await this._db(this.relationTableName).delete().where({user: id, account});
    }

    private async createRelations(relations: Relation[]) {
        try {
            await this._db(this.relationTableName)
                .insert(relations);
        } catch (e) {
            if ((e as MysqlError)?.code === 'ER_DUP_ENTRY') {
                throw new ConflictError();
            }
            throw e;
        }
        return relations;
    }

    private async removeRelations(deletions: RelationDelete[]) {
        await this._db(this.relationTableName)
            .delete()
            .where(qb => {
                for (const deletion of deletions) {
                    qb.orWhere(deletion);
                }
            });
    }

    private async insertRelation(user: string, account:string, sector: string, sectors: RelationSector) {
        const now = new Date().toISOString();

        await this.createRelations([{
            account,
            user,
            sector,
            created_at: now,
            subordinate_to: sectors[sector].subordinate_to,
            is_manager: false,
        }]);
    }

    private async modifyRelation(user: User, account:string, new_sectors: RelationSector, old_sectors: RelationSector) {

        const oldSectors: string[] = old_sectors ? Object.keys(old_sectors) : [user.sector];

        const newSectors = new_sectors ? Object.keys(new_sectors) : [];

        if (oldSectors.length > 0) {
            await this.removeRelations(oldSectors.map(rs => ({sector: rs, user: user.id, account})));
        }

        if (newSectors.length > 0) {
            await this.createRelations(newSectors.map(sector => ({
                account,
                user: user.id,
                sector,
                created_at: new_sectors[sector].created_at,
                subordinate_to: new_sectors[sector].subordinate_to,
                is_manager: new_sectors[sector].is_manager,
            })));
        }
    }

    constructor(
        private _db: Knex,
        private tableName: string,
        private relationTableName: string,

    ) {}
}

const mapper = {
    to: (item: any) => {
        if (!item) {
            return item;
        }

        return {
            ...item,
            working_days: JsonDbMapper.to(item.working_days),
        };
    },
    from: (row: any) => {
        if (!row) {
            return row;
        }

        return {
            ...row,
            disabled: !!row.disabled,
            roles: row.roles || 'admin',
            working_days: JsonDbMapper.from(row.working_days),
        };
    },
};

class JsonDbMapper {
    static from(field?: string) {
        return field;
        // return field ? JSON.parse(field) : field;
    }

    static to(field?: object) {
        return field ? JSON.stringify(field) : field;
    }
}

type Pagination = {
    pageSize: number
    page: number
};

type Ordering = {
    orderBy: string
    order?: string
};

export type UsersMysqlQueryOptions = {
    ordering?: Ordering
    orderingRaw?: OrderByRaw
    managerFirst?: boolean
    pagination?: Pagination
    projection?: (query: Knex.QueryBuilder) => Knex.QueryBuilder
};

function filledWithNull(one = {}, {...other}) {
    for (const key of Object.keys(one)) {
        if (other[key] === undefined) {
            other[key] = null;
        }
    }
    return other;
}
