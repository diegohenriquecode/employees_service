import {CreateEvaluationQuerySchema, DeleteEvaluationQuery, DeleteMultipleEvaluationQuerySchema} from 'api/app/employees/evaluations/schema';
import express from 'express';
import can from 'middlewares/can';
import EvaluationsService from 'modules/evaluations/service';

import config from '../../../../config';
import validation from '../../../../middlewares/validation';
import {CreateMultipleEvaluationSchema} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.post('/', can('create', 'Evaluation'), validation(CreateMultipleEvaluationSchema), validation(CreateEvaluationQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {deep} = req.query;

    const service = EvaluationsService.config(config, user, account);

    let status: number;
    let result;
    if (deep) {
        status = 202;
        result = await service.batchCreateOnSectorDeep(sectorId, req.body);
    } else {
        status = 204;
        result = await service.batchCreateOnSector(sectorId, req.body);
    }

    res.status(status).send(result);
});

router.delete('/', can('delete', 'Evaluation'), validation(DeleteMultipleEvaluationQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {sectorId} = req.params;
    const {deep, type} = req.query as unknown as DeleteEvaluationQuery;

    const service = EvaluationsService.config(config, user, account);

    let status: number;
    let result;
    if (deep) {
        status = 202;
        result = await service.batchRemoveOnSectorDeep(sectorId, type);
    } else {
        status = 204;
        result = await service.batchRemoveOnSector(sectorId, type);
    }

    res.status(status).send(result);
});
