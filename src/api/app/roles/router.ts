import config from 'config';
import express from 'express';
import can from 'middlewares/can';
import validation from 'middlewares/validation';
import Policies, {Policy} from 'modules/roles/policies';
import {Permission, permissionsByRole} from 'modules/roles/rolesConverter';
import {Role} from 'modules/roles/schema';
import RolesService from 'modules/roles/service';

import {CreateRoleSchema, EnableRoleSchema, UpdateRoleSchema} from './schema';

const router = express.Router();
export default router;

router.get('/types', async (req, res) => {
    return res.send(Object.keys(Policies));
});

router.get('/', can('list', 'Role'), async (req, res) => {
    const {user, account} = res.locals;

    const list = await RolesService.config(config, user, account)
        .list(false);

    return res.send(list);
});

router.post('/', can('create', 'Role'), validation(CreateRoleSchema), async (req, res) => {
    const {user, account} = res.locals;

    await RolesService.config(config, user, account)
        .create({
            ...req.body,
            permissions: PolicyMapper.from(req.body.permissions),
            user: user.id,
            account: account.id,
        });

    res.sendStatus(204);
});

router.use('/:roleId', async (req, res, next) => {
    const {user, account} = res.locals;
    const {roleId} = req.params;

    res.locals.object = await RolesService.config(config, user, account)
        .retrieve(roleId);

    next();
});

router.patch('/:roleId/enabled', can('update', 'Role'), validation(EnableRoleSchema), async (req, res) => {
    const {user, account} = res.locals;

    const role = await RolesService.config(config, user, account)
        .update(res.locals.object, req.body);

    return res.send(out(role));
});

router.get('/:roleId', can('detail', 'Role'), async (req, res) => {
    return res.send(out(res.locals.object));
});

router.put('/:roleId', can('update', 'Role'), validation(UpdateRoleSchema), async (req, res) => {
    const {user, account} = res.locals;
    let {name, permissions} = req.body;

    const standardPermissions = permissionsByRole[res.locals.object.id as keyof typeof permissionsByRole] ?? [];
    permissions = PolicyMapper.from(permissions)
        .filter(p => !standardPermissions.includes(p));

    const role = await RolesService.config(config, user, account)
        .update(res.locals.object, {name, permissions});

    return res.send(out(role));
});

function out(role?: Role) {
    if (!role) {
        return role;
    }

    const standardRole = (permissionsByRole[role.id as keyof typeof permissionsByRole] ?? []) as Permission[];

    const notEditablePolicies = PolicyMapper.to(standardRole);
    const editablePolicies = PolicyMapper.to([...role.permissions, ...standardRole])
        .filter(p => !notEditablePolicies.includes(p));

    return {
        ...role,
        permissions: [
            ...editablePolicies.map(p => ({name: p, editable: true})),
            ...notEditablePolicies.map(p => ({name: p, editable: false})),
        ],
    };
}

class PolicyMapper {
    static from(policies?: Policy[]) {
        if (!policies) {
            return [];
        }

        return policies
            .flatMap(p => Policies[p].permissions) as Permission[];
    }

    static to(permissions?: Permission[]) {
        if (!permissions) {
            return [];
        }

        return Object.entries(Policies)
            .filter(([, value]) => value.permissions.every(p => permissions.includes(p)))
            .map(([key]) => key) as Policy[];
    }
}
