import {ConfirmImportSheetUploadSchema, GetImportSheetPutUrl, GetImportSheetPutUrlSchema} from 'api/app/async-tasks/schema';
import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {AsyncTasksType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';

const router = express.Router({mergeParams: true});
export default router;

router.get('/many/template', async (req, res) => {
    res.send({
        url: `${config.mailAssetsUrl}/template-managers.xlsx`,
    });
});

router.get('/many/url', validation(GetImportSheetPutUrlSchema, 'query'), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const {ContentType, ContentLength, ContentDisposition} = req.query as unknown as GetImportSheetPutUrl;

    const result = await AsyncTasksService.config(config, user, accountId)
        .getImportSheetUploadUrl({ContentType, ContentLength, ContentDisposition}, AsyncTasksType.IMPORT_MANAGERS);

    res.send(result);
});

router.post('/many/url', validation(ConfirmImportSheetUploadSchema), async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId} = req.params;

    const result = await AsyncTasksService.config(config, user, accountId)
        .confirmImportSheetUpload(req.body.filePath, AsyncTasksType.IMPORT_MANAGERS);

    res.send(result);
});
