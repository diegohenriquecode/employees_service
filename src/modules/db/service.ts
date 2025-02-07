import {Knex} from 'knex';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {entries} from '../*/migrations/*';
import {NotFoundError} from '../errors/errors';
import db from './index';

import Migration = Knex.Migration;
import MigrationSource = Knex.MigrationSource;

export default class DbService {
    static async migrate() {
        await db.migrate.latest({
            migrationSource: new ESBuildMigrationSource(entries),
        });
    }

    static async list() {
        const [completed, pending] = await db.migrate.list({
            migrationSource: new ESBuildMigrationSource(entries),
        });
        return {completed, pending};
    }

    static async down() {
        await db.migrate.down({
            migrationSource: new ESBuildMigrationSource(entries),
        });
    }

    static async up() {
        await db.migrate.up({
            migrationSource: new ESBuildMigrationSource(entries),
        });
    }
}

class ESBuildMigrationSource implements MigrationSource<string> {
    constructor(
        private _entries: [[string, Migration]],
    ) {}

    async getMigrations() {
        return this._entries
            .map(([k]) => k)
            .sort(migrationsSort);
    }

    getMigrationName(migration: string) {
        return path.parse(migration).base;
    }

    async getMigration(migration: string) {
        const entry = this._entries
            .find(e => e[0] === migration);
        if (entry) {
            return entry[1];
        }
        throw new NotFoundError();
    }
}

function migrationsSort(m1: string, m2: string) {
    const one = path.parse(m1).base;
    const other = path.parse(m2).base;
    if (one < other) {
        return -1;
    }
    if (one > other) {
        return +1;
    }
    return 0;
}
