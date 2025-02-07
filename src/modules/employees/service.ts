import {BarueriConfig} from 'config';
import Mime from 'mime';
import {OrderByRaw, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

import StorageService, {FileData} from '../../utils/storage-service';
import {BadRequestError} from '../errors/errors';
import OrgChartsService from '../orgchart/service';
import UsersRepository from '../users/repository';
import {EmployeeUpdatables} from './schema';

export default class EmployeesService {
    static config(cfg: BarueriConfig, user: User, account: string): EmployeesService {
        return new EmployeesService(
            UsersService.config(cfg, user, account),
            UsersRepository.config(cfg, user.id, account),
            StorageService.configProtected(cfg),
            OrgChartsService.config(cfg, user, account),
            account,
            user,
        );
    }

    async list(props: ListProps) {
        const {sector, ...rest} = props;

        let deepSectors = undefined;
        if (props.deep) {
            deepSectors = await this.sectors.list(sector);
        }

        const {items, page, pageSize, total} = await this.usersService.list({
            ...rest,
            sectors: deepSectors?.map((s) => s.id),
            sector: props.deep ? undefined : sector,
            account: this.account,
        });

        const toExternal = await Promise.all(items.map(this.toExternal.bind(this)));
        return {
            items: toExternal,
            page,
            pageSize,
            total,
        };
    }

    async sectorTeam(sectorId: string) {
        const query = {
            $and: [
                {account: {$eq: this.account}},
                {sector: {$eq: sectorId}},
                {$or: [{disabled: {$ne: true}}, {disabled: {$eq: null}}]},
                {id: {$ne: this.user.id}},
                {roles: {$ne: 'admin'}},
            ],
        };

        const result = await this.usersRepository.list(query, {ordering: {order: 'ASC', orderBy: 'name'}});

        return result.map(out);
    }

    async sectorTeamWithLoggedUser(sectorId: string) {
        const query = {
            $and: [
                {account: {$eq: this.account}},
                {sector: {$eq: sectorId}},
                {$or: [{disabled: {$ne: true}}, {disabled: {$eq: null}}]},
                {roles: {$ne: 'admin'}},
            ],
        };

        const result = await this.usersRepository.list(query, {ordering: {order: 'ASC', orderBy: 'name'}});

        return result.map(out);
    }

    async retrieve(id: string) {
        const result = await this.usersService.retrieve(id);
        return this.toExternal(result);
    }

    async update(id: string, patch: EmployeeUpdatables) {
        await this.usersService.retrieve(id);

        const result = await this.usersService.update(id, patch);

        return this.toExternal(result);
    }

    async avatarUrl(
        id: string,
        {ContentType, ContentLength}: Required<Pick<FileData, 'ContentType' | 'ContentLength'>>,
    ) {
        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentTye: ${ContentType}`);
        }

        const Key = `employees/${this.account}/avatar-${id}.${extension}`;
        const result = this.files.signedPost(Key, {ContentType, ContentLength});

        await this.usersService.update(id, {
            avatar_key: `unconfirmed:${Key}`,
        });

        return result;
    }

    async confirmUpload(filePath: string) {
        const [, , fileName] = filePath.split('/');
        if (!fileName.startsWith('avatar-')) {
            console.log('Ignoring doc write');
            return;
        }

        const id = fileName.replace('avatar-', '').split('.')[0];

        const user = await this.usersService.retrieve(id);
        if (user.avatar_key === `unconfirmed:${filePath}`) {
            await this.usersService.update(id, {
                avatar_key: filePath,
            });
        }
    }

    private async toExternal(user: any) {
        if (!user) {
            return user;
        }

        let avatarUrl;

        const {avatar_key, username, scopes, ...result} = user;
        if (avatar_key && !avatar_key.startsWith('unconfirmed:')) {
            avatarUrl = await this.files.signedGetUrl(avatar_key.replace('unconfirmed:', ''), {Expires: 3600});
        }
        return {avatarUrl, ...result};
    }

    constructor(
    private usersService: UsersService,
    private usersRepository: UsersRepository,
    private files: StorageService,
    private sectors: OrgChartsService,
    private account: string,
    private user: User,
    ) {}
}

function out({password, ...user}: User) {
    return user;
}

type ListProps = {
  includeDisabled: boolean;
  includeSelf: boolean;
  page: number;
  pageSize: number;
  order?: 'ASC' | 'DESC';
  orderBy?: string;
  orderByRaw?: OrderByRaw;
  managerFirst?: boolean;
  search?: string;
  sector?: string;
  searchIn?: [string];
  deep?: boolean;
  subordinate_to?: string;
};
