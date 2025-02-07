import {BarueriConfig} from 'config';
import {compact, orderBy, uniq} from 'lodash';
import {User} from 'modules/users/schema';

import {BadRequestError, ForbiddenError, NotFoundError} from '../errors/errors';
import UsersRepository from '../users/repository';
import {composeTree} from './composer';
import OrgSectorsRepository, {ROOT_ID} from './repository';
import {Sector, SectorProps} from './schema';

export default class OrgChartsService {

    static config(cfg: BarueriConfig, user: User, account: string, query: any = null): OrgChartsService {
        return new OrgChartsService(
            OrgSectorsRepository.config(cfg, user.id, account),
            UsersRepository.config(cfg, user.id, account),
            user,
            account,
            query,
        );
    }

    private getSectorFromPath(path: string) {
        const splitted = path.split(';');
        return splitted[splitted.length - 1];
    }

    private getPathFromQuery() {
        return this.query?.$or?.[0]?.path?.$gte as string || ROOT_ID;
    }

    private async _list(sector: Sector, includeRemoved = false) {
        if (!this.hasPermission(sector)) {
            throw new ForbiddenError();
        }

        return this.repository
            .listByPath(sector.path, {includeRemoved});
    }

    hasPermission(sector: Sector) {
        // condição especial por conta do RolesService. Retirar em futura refatoração.
        if (typeof this.user === 'string') {
            return true;
        }
        const startPath: string = this.getPathFromQuery();
        return sector.path.startsWith(startPath);
    }

    async retrieve(id: string, includeRemoved = false) {
        const sector = await this.repository.retrieve(id);

        if (!sector) {
            throw new NotFoundError('sector not found');
        }
        if (!includeRemoved && sector.removed) {
            throw new NotFoundError('sector not found');
        }
        return sector;
    }

    async list(from = this.getSectorFromPath(this.getPathFromQuery()), includeRemoved = false) {
        const sector = await this.retrieve(from);
        if (!this.hasPermission(sector)) {
            throw new ForbiddenError();
        }

        const list = await this._list(sector, includeRemoved);
        return orderBy(list, ['name'], ['asc']);
    }

    async listByIds(searchIn: string[]) {
        const sectorIds: string[] = compact(uniq(searchIn));
        if (sectorIds.length) {
            return (
                await this.repository
                    .all({includeRemoved: true})
            ).filter(sector => sectorIds.includes(sector.id));
        }

        return [];
    }

    async find(sectorId = this.getSectorFromPath(this.getPathFromQuery())) {
        const requestSector = await this.retrieve(sectorId);
        if (!this.hasPermission(requestSector)) {
            throw new ForbiddenError();
        }
        const sectors = await this.list(sectorId);

        if (sectorId !== ROOT_ID) {
            sectors.forEach(sector => {
                sector.path = sector.path.replace(requestSector.path, requestSector.id);
            });
        }

        return composeTree(sectors);
    }

    async createSector(parentId: string, sectorProps: Pick<SectorProps, 'name' | 'color'>) {
        const parent = await this.retrieve(parentId);

        if (!this.hasPermission(parent)) {
            throw new ForbiddenError();
        }

        if (!parent) {
            throw new NotFoundError('Parent not found');
        }

        await this.repository.add({...sectorProps, path: parent.path});

        return await this.find();
    }

    async moveSector(id: string, newParentId: string) {
        if (id === newParentId) {
            throw new BadRequestError('not allowed to move sector to itself');
        }

        if (id === ROOT_ID) {
            throw new BadRequestError('Forbidden to move root');
        }

        const sector = await this.retrieve(id);
        const parent = await this.retrieve(newParentId);

        if (!this.hasPermission(sector) || !this.hasPermission(parent)) {
            throw new ForbiddenError();
        }

        const sectorTreeItems = await this.repository.listByPath(sector.path, {filterId: sector.id});
        if (sectorTreeItems.find(item => item.id === parent.id)) {
            throw new BadRequestError('Forbidden to move sector to descendant');
        }

        const updatedItems = [{...sector, path: `${parent.path};${sector.id}`}];
        for (const item of sectorTreeItems) {
            const updatedItem = {...item, path: item.path.replace(sector.path, `${parent.path};${sector.id}`)};
            updatedItems.push(updatedItem);
        }

        await this.repository.batchUpdate(updatedItems);

        return await this.find();
    }

    async deleteSector(id: string) {
        const sector = await this.retrieve(id);

        if (!this.hasPermission(sector)) {
            throw new ForbiddenError();
        }

        if (sector.id === ROOT_ID) {
            throw new BadRequestError('Tried deleting root');
        }

        const descendants = await this.repository.listByPath(sector.path, {filterId: sector.id, includeRemoved: false});

        if (descendants.length) {
            throw new BadRequestError('Sector has descendants');
        }

        if (sector.manager) {
            throw new BadRequestError('Cannot delete sectors with associated manager');
        }

        const users = await this.users.list(
            {'$and': [{'account': {'$eq': this.account}}]},
            {},
            {'$and': [{'subordinate_to': {'$eq': id}}]},
        );
        if (users.length > 0) {
            throw new BadRequestError('Cannot delete sectors with associated users');
        }

        await this.repository.patch(id, 'removed', true);

        return await this.find();
    }

    async updateSector(id: string, props: Partial<Pick<SectorProps, 'name' | 'color' | 'manager'>>, dedicatedManager = false) {
        const sector = await this.retrieve(id);
        if (!sector) {
            throw new NotFoundError('Sector not found');
        }

        if (!this.hasPermission(sector)) {
            throw new ForbiddenError();
        }

        let manager;
        if (props.manager && props.manager !== sector.manager) {
            manager = await this.users.retrieve(props.manager);
            if (!manager) {
                throw new NotFoundError();
            }
        }

        await this.repository.update(sector, props);

        if (manager && dedicatedManager) {
            for (const s of Object.keys(manager.sectors)) {
                if (manager.sectors[s].is_manager) {
                    await this.repository.patch(s, 'manager', null);
                }
            }
        }

        return await this.find();
    }

    async managersSectorFor(sector: Sector, forManager: boolean): Promise<Sector> {
        if (!forManager && sector.manager) {
            return sector;
        }

        const parents = sector.id === ROOT_ID
            ? [ROOT_ID]
            : sector.path.split(';').reverse().splice(1);
        let parent;
        for (const s of parents) {
            parent = await this.retrieve(s);
            if (parent.manager) {
                break;
            }
        }

        return parent as Sector;
    }

    constructor(
        private repository: OrgSectorsRepository,
        private users: UsersRepository,
        private user: User,
        private account: string,
        private query: any,
    ) {}
}
