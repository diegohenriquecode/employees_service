import config from 'config';
import express from 'express';
import adminCan from 'middlewares/admin-can';
import {permissionResources, PermissionTypes} from 'modules/admins/schema';
import BoletosService from 'modules/boletos/service';

const router = express.Router({mergeParams: true});
const can = (permission: string) => adminCan(permissionResources.boletos, permission);

router.get('/', can(PermissionTypes.list), async (req, res) => {
    const {accountId} = req.params;
    const userId = res.locals.oauth.token.user.id;

    const list = await BoletosService.config(config, userId)
        .list(accountId);

    return res.send(list);
});

export default router;
