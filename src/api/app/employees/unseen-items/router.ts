import express from 'express';
import {NotFoundError} from 'modules/errors/errors';
import UnseenItemsService from 'modules/unseen-items/service';

import config from '../../../../config';
import {unseenFeatures} from './schema';

const router = express.Router({mergeParams: true});
export default router;

router.get('/:feature', async (req, res) => {
    const {account, user} = res.locals;

    const {employeeId} = req.params;

    const feature = req.params.feature as keyof typeof unseenFeatures;

    if (!unseenFeatures[feature]) {
        throw new NotFoundError('Feature not supported');
    }

    const result = await UnseenItemsService.config(config, user.id)
        .countByEmployeeAndFeature(account.id, employeeId, feature);

    res.send({count: result});
});
