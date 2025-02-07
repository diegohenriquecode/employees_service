import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import TemplatesService from 'modules/templates/service';

import {CreateTemplateSchema, ListTemplateQuerySchema, UpdateTemplateSchema} from './schema';

const router = express.Router();
export default router;

router.get('/', validation(ListTemplateQuerySchema, 'query'), async (req, res) => {
    const {account, user} = res.locals;
    const {type} = req.query;

    const result = await TemplatesService.config(config, user, account)
        .list(type as string);

    res.send(result);
});

router.post('/', validation(CreateTemplateSchema), async (req, res) => {
    const {account, user} = res.locals;

    const result = await TemplatesService.config(config, user, account)
        .create(req.body);

    res.send(result);
});

router.put('/:templateId', validation(UpdateTemplateSchema), async (req, res) => {
    const {account, user} = res.locals;

    const {templateId} = req.params;

    const result = await TemplatesService.config(config, user, account)
        .update(templateId, req.body);

    res.send(result);
});

router.get('/:templateId', async (req, res) => {
    const {account, user} = res.locals;

    const {templateId} = req.params;

    const result = await TemplatesService.config(config, user, account)
        .retrieve(templateId);

    res.send(result);
});

router.delete('/:templateId', async (req, res) => {
    const {account, user} = res.locals;

    const {templateId} = req.params;

    await TemplatesService.config(config, user, account)
        .delete(templateId);

    res.sendStatus(204);
});
