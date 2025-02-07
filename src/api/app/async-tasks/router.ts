import config from 'config';
import express from 'express';
import AsyncTasksService from 'modules/async-tasks/service';

const router = express.Router();
export default router;

router.get('/:asyncTaskId', async (req, res) => {
    const {account, user} = res.locals;

    const {asyncTaskId} = req.params;

    const result = await AsyncTasksService.config(config, user, account.id)
        .getAsyncTask(asyncTaskId, true);

    res.send(result);
});
