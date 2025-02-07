import express from 'express';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import NotesRepository from '../../../modules/notes/repository';
import {CreateNoteSchema} from './schema';

const router = express.Router();
export default router;

router.post('/', validation(CreateNoteSchema), async (req, res) => {
    await NotesRepository.config(config, res.locals.user.id)
        .create({
            ...req.body,
            user: res.locals.user.id,
            account: res.locals.account_id,
        });

    res.sendStatus(204);
});
