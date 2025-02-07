import express from 'express';
import validation from 'middlewares/validation';
import ClimateCheckAssiduityService from 'modules/climate-check-assiduity/service';
import {ClimateCheckHistoryItem, ClimateCheckHistoryItemType} from 'modules/climate-check-history/schema';
import ClimateCheckHistoryService from 'modules/climate-check-history/service';
import ClimateChecksService from 'modules/climate-checks/service';
import moment from 'moment';

import config from '../../../../config';
import {QueryClimateCheckAssiduityArgs, QueryClimateCheckAssiduityArgsSchema, QueryClimateCheckHistoryArgs, QueryClimateCheckHistoryArgsSchema, QueryClimateChecksArgs, QueryClimateChecksArgsSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', validation(QueryClimateChecksArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {deep, date} = req.query as unknown as QueryClimateChecksArgs;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'list');

    const service = ClimateChecksService.config(config, account, user, mongoQuery);

    let result;
    if (deep) {
        result = await service.deepDailyCheck(sectorId, date);
    } else {
        result = await service.dailyCheck(sectorId, date);
    }

    res.send(result);
});

router.get('/history', validation(QueryClimateCheckHistoryArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {from, to, deep} = req.query as unknown as QueryClimateCheckHistoryArgs;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'list');

    const type = deep ? ClimateCheckHistoryItemType.deep : ClimateCheckHistoryItemType.shallow;

    const result = await ClimateCheckHistoryService.config(config, account.id, user, mongoQuery)
        .list(sectorId, type, moment(from), moment(to));

    res.send(result.map(climateHistoryOut));

});

router.get('/assiduity', validation(QueryClimateCheckAssiduityArgsSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {from, to} = req.query as unknown as QueryClimateCheckAssiduityArgs;

    const mongoQuery = user.ability
        .mongoQuery('Sector', 'list');

    const result = await ClimateCheckAssiduityService.config(config, account.id, user, mongoQuery)
        .assiduityOnPeriod(sectorId, moment(from ?? 0), moment(to ?? undefined));

    res.send(result);
});

const climateHistoryOut = ({account, created_at, type, ...item}: ClimateCheckHistoryItem) => item;
