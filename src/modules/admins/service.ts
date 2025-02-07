import bcrypt from 'bcryptjs';
import {BarueriConfig} from 'config';

import {ConflictError, NotFoundError} from '../errors/errors';
import AdminsRepository from './repository';
import {Admin, AdminProps} from './schema';

export default class AdminsService {
    static config(cfg: BarueriConfig, user: string) {
        return new AdminsService(
            AdminsRepository.config(cfg, user),
        );
    }

    async create(user: AdminProps) {
        const byMail = await this.repository.findByEmail(user.email);
        if (byMail) {
            throw new ConflictError();
        }

        if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
        }

        const result = await this.repository
            .create(user);

        return out(result);
    }

    async list() {
        const result = await this.repository
            .list();

        return result.map(out);
    }

    async retrieve(adminId: string) {
        const admin = this.repository.retrieve(adminId);

        if (!admin) {
            throw new NotFoundError('Admin not found');
        }

        return admin;
    }

    async findByEmail(username: string) {
        const result = await this.repository
            .findByEmail(username);
        return out(result);
    }

    async findVerified(username: string, password: string) {
        const user = await this.repository.findByEmail(username);
        if (!user) {
            return null;
        }
        if (!(await bcrypt.compare(password, user.password || ''))) {
            return null;
        }
        return {
            ...user,
            password: undefined,
        };
    }

    async setPassword(id: string, password: string) {
        await this.repository
            .patch(id, 'password', await bcrypt.hash(password, 10));
    }

    async update(id: string, admin: Admin) {
        const current = await this.retrieve(id);

        if (admin.password) {
            admin.password = await bcrypt.hash(admin.password, 10);
        }

        const result = await this.repository
            .update(current, admin);

        return out(result);
    }

    async setDisabled(id: string, value: string) {
        await this.repository
            .patch(id, 'disabled', value);
    }

    constructor(
        private repository: AdminsRepository,
    ) { }
}

function out(item: Record<string, any>) {
    if (!item) {
        return item;
    }
    const {password, ...admin} = item;
    return admin;
}
