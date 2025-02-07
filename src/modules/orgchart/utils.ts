import omit from 'lodash/omit';
import {TreeSector} from 'modules/orgchart/schema';

export function bfsList(sector: TreeSector) {
    const result: (Omit<TreeSector, 'children'> & {parent: TreeSector[]})[] = [];
    const queue: (TreeSector & {parent: TreeSector[]})[] = [];

    const sortByName = (array: Array<any>) => {
        return array.sort(
            function (a, b) {
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                }
                if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    return 1;
                }
                return 0;
            },
        );
    };

    queue.push({...omit(sector, 'children'), parent: [], children: sortByName(sector.children)});

    while (queue.length > 0) {
        const current = queue.shift();

        if (current) {
            result.push(omit(current, 'children'));

            if (current.children.length > 0) {
                const children = current.children.map(s => ({
                    ...s,
                    parent: [...(current?.parent ?? []), omit(current, 'children', 'parent')],
                }));
                queue.push(...sortByName(children));
            }
        }
    }

    return result;
}

export function leafsList(sector: TreeSector) {
    const result: (Omit<TreeSector, 'children'> & {parent: TreeSector[]})[] = [];
    const queue: (TreeSector & {parent: TreeSector[]})[] = [];

    queue.push({...omit(sector, 'children'), parent: [], children: sector.children});

    while (queue.length > 0) {
        const current = queue.shift();

        if (current) {
            if (current.children.length > 0) {
                const children = current.children.map(s => ({
                    ...s,
                    parent: [...(current?.parent ?? []), omit(current, 'children', 'parent')],
                }));
                queue.push(...children);
            } else {
                result.push(omit(current, 'children'));
            }
        }
    }

    return result;
}
