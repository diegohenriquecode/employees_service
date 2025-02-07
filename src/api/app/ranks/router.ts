import express from 'express';
import validation from 'middlewares/validation';
import {AsyncTasksType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {Rank} from 'modules/ranks/schema';
import RanksService from 'modules/ranks/service';

import config from '../../../config';
import {ConfirmImportSheetUploadSchema, GetImportSheetPutUrl, GetImportSheetPutUrlSchema} from '../async-tasks/schema';
import {CreateRankSchema, SetDisabledSchema, UpdateRankSchema} from './schema';

const router = express.Router();
export default router;

router.get('/', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const result = await RanksService.config(config, user, account)
        .list();

    res.send(result.map(list));
});

router.post('/', validation(CreateRankSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const result = await RanksService.config(config, user, account)
        .create(req.body);

    res.send(result);
});

router.get('/:rankId', async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {rankId} = req.params;

    const result = await RanksService.config(config, user, account)
        .retrieve(rankId);

    res.send(result);
});

router.put('/:rankId', validation(UpdateRankSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {rankId} = req.params;
    const result = await RanksService.config(config, user, account)
        .update(rankId, req.body);

    res.send(result);
});

router.put('/:rankId/disabled', validation(SetDisabledSchema), async (req, res) => {
    const {account_id: account, user} = res.locals;

    const {rankId} = req.params;
    const disabled = req.body;

    await RanksService.config(config, user, account)
        .setDisabled(rankId, disabled);

    res.sendStatus(204);
});

router.get('/many/template', async (req, res) => {
    res.send({
        url: `${config.mailAssetsUrl}/template-ranks.xlsx`,
    });
});

router.get('/many/url', validation(GetImportSheetPutUrlSchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;

    const {ContentType, ContentLength, ContentDisposition} = req.query as unknown as GetImportSheetPutUrl;

    const result = await AsyncTasksService.config(config, user, account.id)
        .getImportSheetUploadUrl({ContentType, ContentLength, ContentDisposition}, AsyncTasksType.IMPORT_RANKS);

    res.send(result);
});

router.post('/many/url', validation(ConfirmImportSheetUploadSchema), async (req, res) => {
    const {account, user} = res.locals;

    const result = await AsyncTasksService.config(config, user, account.id)
        .confirmImportSheetUpload(req.body.filePath, AsyncTasksType.IMPORT_RANKS);

    res.send(result);
});

function list(rank: Rank) {
    if (!rank) {
        return rank;
    }

    const {id, title, disabled, created_at, created_by, updated_at, updated_by} = rank;

    return {id, title, disabled, created_at, created_by, updated_at, updated_by};
}
