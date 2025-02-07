import config from 'config';
import RolesRepository from 'modules/roles/repository';
import {permissionsByRole} from 'modules/roles/rolesConverter';
import RolesService from 'modules/roles/service';
import sift from 'sift';

import {ListProps} from './schema';
import EvaluationsService from './service';

describe('getListQuery', () => {
    let rolesService: RolesService;
    beforeAll(() => {
        rolesService = new RolesService(
            RolesRepository.config(config, 'test-user', 'test-account'),
            null,
            sectors,
            'test-account',
        );

        rolesService.retrieve = (id) => {
            return {
                id: id,
                name: id,
                permissions: permissionsByRole[id as keyof typeof permissionsByRole],
            };
        };
    });
    test('Manager can list only sectors below', async () => {
        const user = manager;
        const evaluationService = new EvaluationsService(
            null,
            null,
            null,
            null,
            null,
            sectors,
            null,
            null,
            null,
            'test-account',
            user,
        );
        const rules = await rolesService.rules(user);
        const ability = rolesService.userAbility(user, rules);

        const mongoQuery = ability
            .mongoQuery('Evaluation', 'list');

        const query = await evaluationService.getListQuery({} as ListProps, mongoQuery);

        const filteredEvaluations = evaluations.filter(sift(query));

        expect(filteredEvaluations.map(e => e.id)).toEqual(['decision-matrix-left', 'decision-matrix-left2', 'decision-matrix-sub-left']);
    });

    test('RH can list all', async () => {
        const user = rh;

        const evaluationService = new EvaluationsService(
            null,
            null,
            null,
            null,
            null,
            sectors,
            null,
            null,
            null,
            'test-account',
            user,
        );

        const rules = await rolesService.rules(user);
        const ability = rolesService.userAbility(user, rules);

        const mongoQuery = ability
            .mongoQuery('Evaluation', 'list');

        const query = await evaluationService.getListQuery({} as ListProps, mongoQuery);

        const filteredEvaluations = evaluations.filter(sift(query));

        expect(filteredEvaluations.map(e => e.id)).toEqual(evaluations.map(e => e.id));
    });

    test('RH manager can list all', async () => {
        const user = rhManager;

        const evaluationService = new EvaluationsService(
            null,
            null,
            null,
            null,
            null,
            sectors,
            null,
            null,
            null,
            'test-account',
            user,
        );

        const rules = await rolesService.rules(user);
        const ability = rolesService.userAbility(user, rules);

        const mongoQuery = ability
            .mongoQuery('Evaluation', 'list');

        const query = await evaluationService.getListQuery({} as ListProps, mongoQuery);

        const filteredEvaluations = evaluations.filter(sift(query));

        expect(filteredEvaluations.map(e => e.id)).toEqual(evaluations.map(e => e.id));
    });

    test('Employee can only list for him', async () => {
        const user = employee;

        const evaluationService = new EvaluationsService(
            null,
            null,
            null,
            null,
            null,
            sectors,
            null,
            null,
            null,
            'test-account',
            user,
        );

        const rules = await rolesService.rules(user);
        const ability = rolesService.userAbility(user, rules);

        const mongoQuery = ability
            .mongoQuery('Evaluation', 'list');

        const query = await evaluationService.getListQuery({} as ListProps, mongoQuery);

        const filteredEvaluations = evaluations.filter(sift(query));

        expect(filteredEvaluations.map(e => e.id)).toEqual(['decision-matrix-left']);
    });
});

const sectors = {
    async retrieve(id: string) {
        return _sectors
            .find(s => s.id === id);
    },
    async list(from = 'root') {
        const sector = await this.retrieve(from);

        return _sectors
            .filter(s => s.path.startsWith(sector.path));
    },
};

const rh = {id: 'rh-id', sector: 'right', roles: 'rh', sectors: {right: {created_at: new Date().toISOString(), subordinate_to: 'right', is_manager: false}}};
const manager = {id: 'manager-left', sector: 'left', roles: 'employee', sectors: {left: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: true}}};
const rhManager = {id: 'rh-manager-id', sector: 'sub-left', roles: 'rh', sectors: {['sub-left']: {created_at: new Date().toISOString(), subordinate_to: 'left', is_manager: true}}};
const employee = {id: 'employee-left', sector: 'left', roles: 'employee', sectors: {left: {created_at: new Date().toISOString(), subordinate_to: 'left', is_manager: false}}};

const _sectors = [
    {id: 'root', path: 'root'},
    {id: 'left', path: 'root;left', manager: manager.id},
    {id: 'right', path: 'root;right'},
    {id: 'sub-left', path: 'root;left;sub-left', manager: rhManager.id},
];

const evaluations = [
    {
        'account': 'test-account',
        '_employee_id': 'employee-root:decision-matrix-done',
        'created_at': '2022-12-12T12:02:42.305Z',
        'created_by': 'manager-root',
        'employee': 'employee-root',
        'id': 'decision-matrix-done',
        'responsible': 'manager-root',
        'sector': 'root',
        'status': 'done',
        'type': 'decision-matrix',
        'updated_at': '2022-12-12T12:02:42.305Z',
        'updated_by': 'manager-root',
    },
    {
        'account': 'test-account',
        '_employee_id': 'employee-right:decision-matrix-right',
        'created_at': '2022-12-12T12:02:42.305Z',
        'created_by': 'manager-right',
        'employee': 'employee-right',
        'id': 'decision-matrix-right',
        'responsible': 'manager-right',
        'sector': 'right',
        'status': 'done',
        'type': 'decision-matrix',
        'updated_at': '2022-12-12T12:02:42.305Z',
        'updated_by': 'manager-right',
    },
    {
        'account': 'test-account',
        '_employee_id': 'employee-left:decision-matrix-left',
        'created_at': '2022-12-12T12:02:42.306Z',
        'created_by': 'manager-left',
        'employee': 'employee-left',
        'id': 'decision-matrix-left',
        'responsible': 'manager-left',
        'sector': 'left',
        'status': 'created',
        'type': 'decision-matrix',
        'updated_at': '2022-12-12T12:02:42.306Z',
        'updated_by': 'manager-left',
        'disclosed_to_employee': true,
    },
    {
        'account': 'test-account',
        '_employee_id': 'employee-left2:decision-matrix-left2',
        'created_at': '2022-12-12T12:02:42.306Z',
        'created_by': 'manager-left',
        'employee': 'employee-left2',
        'id': 'decision-matrix-left2',
        'responsible': 'manager-left',
        'sector': 'left',
        'status': 'created',
        'type': 'decision-matrix',
        'updated_at': '2022-12-12T12:02:42.306Z',
        'updated_by': 'manager-left',
    },
    {
        'account': 'test-account',
        '_employee_id': 'employee-sub-left:decision-matrix-sub-left',
        'created_at': '2022-12-12T12:02:42.306Z',
        'created_by': 'manager-sub-left',
        'employee': 'employee-sub-left',
        'id': 'decision-matrix-sub-left',
        'responsible': 'manager-sub-left',
        'sector': 'sub-left',
        'status': 'created',
        'type': 'decision-matrix',
        'updated_at': '2022-12-12T12:02:42.306Z',
        'updated_by': 'manager-sub-left',
    }];
