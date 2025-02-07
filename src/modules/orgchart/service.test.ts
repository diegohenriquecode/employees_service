import {BadRequestError, NotFoundError} from 'modules/errors/errors';
import {v4 as uuidV4} from 'uuid';

import {composeTree} from './composer';
import {ROOT_ID} from './repository';
import OrgChartsService from './service';

describe('OrgChartsService', () => {
    beforeAll(() => {
        jest
            .useFakeTimers()
            .setSystemTime(date);
    });

    beforeEach(() => {
        orgSectors = null;
        orgSectors = factory.orgSectors();
        users = [];
    });

    describe('find', () => {
        test('successfully returns orgchart from sectors', async () => {
            await expect(service.find()).resolves.toMatchObject(composeTree(orgSectors));
        });

        test('successfully returns complete tree on root', async () => {
            await expect(service.find(ROOT_ID)).resolves.toMatchObject(composeTree(orgSectors));
        });

        test('successfully returns partial tree on sector id', async () => {
            const expectedSectors = [orgSectors[1], orgSectors[3], orgSectors[4]];
            expectedSectors.forEach(sector => {
                sector.path = sector.path.replace(expectedSectors[0].path, expectedSectors[0].id);
            });
            await expect(service.find(orgSectors[1].id)).resolves.toMatchObject(composeTree(expectedSectors));
        });
    });

    describe('list', () => {
        test('successfully returns flat sectors list', async () => {
            orgSectors = [
                {id: ROOT_ID, name: 'A', path: ROOT_ID, color: ''},
                {id: 'B', name: 'B', path: `${ROOT_ID};A`, color: ''},
                {id: 'C', name: 'C', path: `${ROOT_ID};A`, color: ''},
            ];

            await expect(service.list()).resolves.toStrictEqual(orgSectors);
        });
    });

    describe('createSector', () => {
        test('successfully add sector to orgchart', async () => {
            const sector = {name: 'Foo', color: ''};
            await service.createSector(ROOT_ID, sector);

            await expect(service.list()).resolves.toEqual(expect.arrayContaining([expect.objectContaining(sector)]));
        });
    });

    describe('moveSector', () => {
        test('throws for trying to move a non-existant node', async () => {
            await expect(service.moveSector('xz', '1')).rejects.toThrow(NotFoundError);
        });

        test('throws for trying to move existing node to a non-existant father', async () => {
            await expect(service.moveSector('2', 'xz')).rejects.toThrow(NotFoundError);
        });

        test('throws for trying to move root', async () => {
            await expect(service.moveSector(ROOT_ID, '2')).rejects.toThrow(BadRequestError);
        });

        test('throws for trying to move node to its descendant', async () => {
            await expect(service.moveSector('3', '4')).rejects.toThrow(BadRequestError);
        });

        test('successfully moves sector', async () => {
            const toBeMoved = orgSectors[1];
            const toReceive = orgSectors[2];

            await service.moveSector(toBeMoved.id, toReceive.id);

            const movedSector = await service.retrieve(toBeMoved.id);
            expect(movedSector.path).toEqual(`${toReceive.path};${toBeMoved.id}`);
        });
    });

    describe('updateSector', () => {
        test('throws for trying to update a non-existant node', async () => {
            expect(service.updateSector('foo', {name: 'Foobar'})).rejects.toThrow(NotFoundError);
        });

        test('successfully updates sector', async () => {
            await service.updateSector('2', {name: '2-updated', color: 'red'});

            const sector = await service.retrieve('2');
            expect(sector.name).toEqual('2-updated');
            expect(sector.color).toEqual('red');
        });
    });

    describe('deleteSector', () => {
        test('throws for removing non-existant node', async () => {
            await expect(service.deleteSector('bar')).rejects.toThrow(NotFoundError);
        });

        test('throws for trying to delete root', async () => {
            await expect(service.deleteSector(ROOT_ID)).rejects.toThrow(BadRequestError);
        });

        test('throws for trying to delete node with descendants', async () => {
            await expect(service.deleteSector('3')).rejects.toThrow(BadRequestError);
        });

        test('throws for trying delete node with associated users', async () => {
            users = [{id: 'id', name: 'name'}];

            await expect(service.deleteSector('1')).rejects.toThrow(BadRequestError);
        });

        test('throws for trying delete node with associated manager', async () => {
            await expect(service.deleteSector('5')).rejects.toThrow(BadRequestError);
        });

        test('successfully deletes sector', async () => {
            await service.deleteSector('4');

            await expect(service.retrieve('4')).rejects.toThrow(NotFoundError);
        });

        test('soft delete', async () => {
            await service.deleteSector('2');

            expect(orgSectors[2].removed).toBe(true);
        });
    });

    describe('retrieve', () => {
        test('throws for unknown sector', async () => {
            await expect(service.retrieve('foo')).rejects.toThrow(NotFoundError);
        });

        test('successfully returns existant sector', async () => {
            const sector = orgSectors[1];
            await expect(service.retrieve('1')).resolves.toStrictEqual(sector);
        });
    });
});

const date = new Date();

const AccountId = 'account';
const UserId = 'user';

let orgSectors;
let users;

const service = new OrgChartsService({
    add: (item, isRoot) => {
        const id = isRoot ? ROOT_ID : uuidV4();
        item = {...item, id, path: isRoot ? id : `${item.path};${id}`};
        if (orgSectors) {
            orgSectors.push(item);
        } else {
            orgSectors = [item];
        }
    },
    all: () => orgSectors || [],
    batchUpdate: (updates) => {
        updates.forEach(update => {
            const index = orgSectors.findIndex(sector => sector.id === update.id);
            orgSectors[index] = update;
        });
    },
    listByPath: (path, {filterId}) => orgSectors.filter(sector => sector.path.startsWith(path) && sector.id !== filterId),
    retrieve: (id) => orgSectors.find(sector => sector.id === id),
    update: (current, patch) => {
        orgSectors = orgSectors.map(sector => sector.id === current.id ? ({...current, ...patch}) : sector);
    },
    patch: (id, field, value) => {
        orgSectors.find(sector => sector.id === id)[field] = value;
    },
}, {
    retrieve: (id) => users.find(user => user.id === id),
    list: () => users,
}, UserId, AccountId, null);

const factory = {
    orgChart: (rootChildren) => {
        return {
            tree: {id: ROOT_ID, name: 'Raíz', children: rootChildren ?? []},
        };
    },
    orgSectors: () => {
        return orgSectors || [
            {id: ROOT_ID, manager: '1', name: 'Raíz', color: '', path: ROOT_ID},
            {id: '1', manager: '1', name: '1', color: '', path: `${ROOT_ID};1`},
            {id: '2', manager: null, name: '2', color: '', path: `${ROOT_ID};2`},
            {id: '3', manager: '1', name: '3', color: '', path: `${ROOT_ID};1;3`},
            {id: '4', manager: null, name: '4', color: '', path: `${ROOT_ID};1;3;4`},
            {id: '5', manager: 1, name: '5', color: '', path: `${ROOT_ID};1;3;5`},
        ];
    },
};
