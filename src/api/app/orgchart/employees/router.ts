import express from 'express';

import config from '../../../../config';
import EmployeesService from '../../../../modules/employees/service';

const router = express.Router({mergeParams: true});
export default router;

router.get('/', async (req, res) => {
    const {account, user} = res.locals;
    const {sectorId} = req.params;

    const result = await EmployeesService.config(config, user, account.id)
        .sectorTeamWithLoggedUser(sectorId);

    res.send(result.map(list));
});

function list(user: any) {
    if (!user) {
        return user;
    }

    const {id, name, sector, rank, disabled, avatarUrl, hired_at} = user;

    return {id, name, sector, rank, disabled, avatarUrl, hired_at};
}
