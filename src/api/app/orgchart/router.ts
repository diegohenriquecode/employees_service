import express from 'express';
import omit from 'lodash/omit';
import EmployeesService from 'modules/employees/service';
import {ROOT_ID} from 'modules/orgchart/repository';
import {Sector} from 'modules/orgchart/schema';
import OrgChartsService from 'modules/orgchart/service';
import {bfsList} from 'modules/orgchart/utils';
import {UserHierarchicalOut, HierarchicalValues} from 'modules/users-hierarchical/schema';
import UsersHierarchicalService from 'modules/users-hierarchical/service';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import climateChecks from './climate-checks/router';
import employees from './employees/router';
import evaluationsScheduler from './evaluations-scheduler/router';
import evaluations from './evaluations/router';
import {CreateSectorSchema, FindQueryArgs, FindQueryArgsSchema, MoveSectorSchema, SectorEmployeesQueryArgs, SectorEmployeesQueryArgsSchema, UpdateSectorSchema, PatchSectorQueryArgs, patchSectorQuerySchema} from './schema';

const router = express.Router();
export default router;

router.use('/:sectorId/evaluations', evaluations);
router.use('/:sectorId/evaluations-scheduler', evaluationsScheduler);
router.use('/:sectorId/climate-checks', climateChecks);
router.use('/:sectorId/employees', employees);

router.get('/', validation(FindQueryArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'list');

    const query = req.query as unknown as FindQueryArgs;

    const service = OrgChartsService.config(config, user, account.id, mongoQuery);
    let result;
    if (query.tree) {
        result = await service.find(query.from);
    } else {
        result = (await service.list(query.from, query.includeRemoved)).map(list);
    }

    res.send(result);
});

router.get('/employees', validation(SectorEmployeesQueryArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'list');

    const query = req.query as unknown as SectorEmployeesQueryArgs;

    const service = OrgChartsService.config(config, user, account.id, mongoQuery);

    const {tree} = await service.find(query.from);
    const sectors = bfsList(tree);

    const {items, ...rest} = await EmployeesService.config(config, user, account.id)
        .list({
            ...query,
            deep: true,
            sector: query.from ?? ROOT_ID,
            includeSelf: true,
            includeDisabled: false,
            orderByRaw: {
                field: 'sector',
                expression: `${sectors.map((i) => `"${i.id}"`).join(',')}`,
            },
            managerFirst: true,
        });

    res.send({
        ...rest,
        items: items.map(employeeOut),
    });
});

router.get('/hierarchical', async (req, res) => {
    const {account, user} = res.locals;

    const hierarchical = await UsersHierarchicalService.config(config, user, account.id)
        .list();

    res.send(hierarchical.map(hierarchicalOut));
});

router.post('/:sectorId/children', validation(CreateSectorSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {name, color} = req.body;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'create');

    const result = await OrgChartsService.config(config, user, account.id, mongoQuery)
        .createSector(sectorId, {name, color});

    res.send(result);
});

router.put('/:sectorId/children', validation(MoveSectorSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {id} = req.body;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'list');

    const result = await OrgChartsService.config(config, user, account.id, mongoQuery)
        .moveSector(id, sectorId);

    res.send(result);
});

router.get('/:sectorId', async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'detail');

    const sector = await OrgChartsService.config(config, user, account.id, mongoQuery)
        .retrieve(sectorId, true);

    res.send(out(sector));
});

router.patch('/:sectorId', validation(UpdateSectorSchema), validation(patchSectorQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;

    const {dedicatedManager} = req.query as unknown as PatchSectorQueryArgs;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'update');

    const result = await OrgChartsService.config(config, user, account.id, mongoQuery)
        .updateSector(sectorId, req.body, dedicatedManager);

    res.send(result);
});

router.delete('/:sectorId', async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'delete');

    const result = await OrgChartsService.config(config, user, account.id, mongoQuery)
        .deleteSector(sectorId);

    res.send(result);
});

const out = ({account, path, ...sector}: Sector) => {

    const splittedPath = path.split(';').reverse();
    const parent = splittedPath.length > 1 ? splittedPath[1] : null;

    return {...sector, parent};
};

function list(sector: Sector) {
    return omit(
        sector,
        ['account', 'removed', 'created_at', 'created_by', 'updated_at', 'updated_by'],
    );
}

function employeeOut(employee: any) {
    if (!employee) {
        return employee;
    }

    const {id, username, name, sector, rank, disabled, avatarUrl} = employee;

    return {id, username, name, sector, rank, disabled, avatarUrl};
}

const hierarchicalOut = (hierarchical: UserHierarchicalOut) => {
    return {
        id: hierarchical.user_id,
        hierarchical_level: HierarchicalValues[hierarchical.hierarchical_level as keyof typeof HierarchicalValues],
        subordinate_to: UsersHierarchicalService.sanitizedSubordinateTo(hierarchical),
        sector: hierarchical.sector,
        subordinate_sector: hierarchical.subordinate_sector,
    };
};
