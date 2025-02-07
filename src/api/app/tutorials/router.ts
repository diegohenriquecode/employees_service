import express from 'express';
import pick from 'lodash/pick';
import {NotFoundError} from 'modules/errors/errors';
import TutorialsService from 'modules/tutorials/service';
import {VideoStatus} from 'modules/videos/schema';

import config from '../../../config';

const router = express.Router();
export default router;

router.get('/', async (req, res) => {
    const {user} = res.locals;
    const roles = user.rolesArray;

    const result = await TutorialsService.config(config, user.id)
        .list({disabled: false, status: VideoStatus.Uploaded, roles});

    res.send(result.map(out));
});

router.get('/:id/url', async (req, res) => {
    const {user} = res.locals;
    const roles = user.rolesArray;

    const result = await TutorialsService.config(config, user.id)
        .retrieve(req.params.id, roles);
    if (!result.url) {
        throw new NotFoundError();
    }

    res.send(result.url);
});

function out(item) {
    if (!item) {
        return item;
    }

    return pick(item, ['id', 'title', 'thumbnail', 'tags', 'roles']);
}
