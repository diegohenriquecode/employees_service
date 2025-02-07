import {Sector, TreeSector} from './schema';

export const composeTree = (sectors: Sector[]) => {
    const pathSearch: {[key: string]: TreeSector[]} = {};
    sectors.forEach(sector => {
        const path = sector.path.replace(sector.id, '').replace(/;$/, '');
        const treeSector: TreeSector = {
            children: [],
            manager: sector.manager,
            color: sector.color,
            id: sector.id,
            name: sector.name,
            path: sector.path,
        };
        if (!pathSearch[path]) {
            pathSearch[path] = [treeSector];
        } else {
            pathSearch[path].push(treeSector);
        }
    });

    const tree: TreeSector = pathSearch[''][0];

    const items = [tree];
    while (items.length) {
        const sector = items.shift();
        if (!sector) {
            throw new Error('path list emptied before expected');
        }
        if (!sector.path) {
            continue;
        }

        const sectorItems = pathSearch[sector.path];
        if (!sectorItems) {
            continue;
        }

        sector.children.push(...sectorItems);
        items.push(...sectorItems);
    }

    return {
        tree,
    };
};
