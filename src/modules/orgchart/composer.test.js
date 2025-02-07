
import {composeTree} from './composer';
import {ROOT_ID} from './repository';

describe('composeTree', () => {
    test('successfully composes tree', () => {
        const sectors = [
            {path: ROOT_ID, manager: '1', name: 'Raíz', id: 'root', color: 'red'},
            {path: `${ROOT_ID};1`, manager: '1', name: '1', color: '', id: '1'},
            {path: `${ROOT_ID};1;2`, manager: '1', name: '2', color: '', id: '2'},
            {path: `${ROOT_ID};1;3`, manager: '1', name: '3', color: '', id: '3'},
            {path: `${ROOT_ID};1;3;4`, manager: '1', name: '4', color: '', id: '4'},
        ];
        const composedTree = composeTree(sectors);
        expect(composedTree).toStrictEqual({
            tree: {
                color: 'red',
                id: ROOT_ID,
                manager: '1',
                name: 'Raíz',
                path: ROOT_ID,
                children: [
                    {
                        color: '',
                        id: '1',
                        manager: '1',
                        name: '1',
                        path: `${ROOT_ID};1`,
                        children: [
                            {
                                children: [],
                                color: '',
                                id: '2',
                                manager: '1',
                                name: '2',
                                path: `${ROOT_ID};1;2`,
                            },
                            {
                                color: '',
                                id: '3',
                                manager: '1',
                                name: '3',
                                path: `${ROOT_ID};1;3`,
                                children: [
                                    {color: '', id: '4', manager: '1', name: '4', path: `${ROOT_ID};1;3;4`, children: []},
                                ],
                            },
                        ],
                    },
                ],
            },
        });
    });
});
