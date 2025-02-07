import express from 'express';
import adminCan from 'middlewares/admin-can';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import {NotFoundError} from '../../../modules/errors/errors';
import NotesRepository from '../../../modules/notes/repository';
import {Query, QuerySchema} from './schema';

const router = express.Router();
export default router;
const can = (permission: string) => adminCan(permissionResources.notes, permission);

router.get('/', can(PermissionTypes.list), validation(QuerySchema, 'query'), async (req, res) => {
    const repository = NotesRepository.config(config, res.locals.oauth.token.user.id);
    const {page, pageSize, order, orderBy} = req.query as unknown as Query;

    const dbQuery = {'$and': []};
    const [total, items] = await Promise.all([
        repository.count(dbQuery),
        repository.list(dbQuery, {
            pagination: {page, pageSize},
            ordering: {order, orderBy},
        }),
    ]);

    const result = {
        total,
        items: items
            .map(i => ({...i, text: i.text.substring(0, 99)})),
        page,
        pageSize,
    };

    res.send(result);
});

router.get('/:noteId', can(PermissionTypes.detail), async (req, res) => {
    const result = await NotesRepository.config(config, res.locals.oauth.token.user.id)
        .retrieve(req.params.noteId);
    if (!result) {
        throw new NotFoundError();
    }

    res.send(result);
});
