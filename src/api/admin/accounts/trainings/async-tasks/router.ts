import config from 'config';
import express from 'express';
import AsyncTasksService from 'modules/async-tasks/service';

const router = express.Router({mergeParams: true});
export default router;

router.get('/:asyncTaskId', async (req, res) => {
    const user = res.locals.oauth.token.user;

    const {accountId, asyncTaskId} = req.params as {accountId: string, asyncTaskId: string};

    const result = await AsyncTasksService.config(config, user, accountId)
        .getAsyncTask(asyncTaskId, true);

    res.send(result);
});
