import {createMongoAbility} from '@casl/ability';
import {toMongoQuery} from '@casl/mongoose';
import {FeedbackStatus} from 'modules/feedbacks/schema';
import {REPRIMAND_STATUS} from 'modules/reprimands/schema';

import {EvaluationStatus, EvaluationType} from '../evaluations/schema';
import {SUSPENSION_STATUS} from '../suspensions/schema';
import RolesRepository from './repository';
import {permissionsByRole} from './rolesConverter';
import RolesService, {BarueriAbility} from './service';

describe('RolesService#can', () => {
    let roles;
    beforeAll(() => {
        const service = new RolesService(
            new RolesRepository(),
            users,
            sectors,
            account,
        );

        service.retrieve = (id) => {
            return {
                id: id,
                name: id,
                permissions: permissionsByRole[id],
            };
        },

        roles = {
            async can(user, action, object, field) {
                return service.userAbility(user, await service.rules(user))
                    .can(action, object, field);
            },
            async allowedKeys(user, action, type, object) {
                return service.userAbility(user, await service.rules(user))
                    .onlyAllowedFields(type, action)(object);
            },
        };
    });

    describe('Users', () => {
        test('can be listed only by "admin"', async () => {
            await expect(roles.can(admin, 'list', any('User'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', any('User'))).resolves.toBe(false);
            await expect(roles.can(employee, 'list', any('User'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('User'))).resolves.toBe(false);
        });
        test('can be created only by "admin"', async () => {
            await expect(roles.can(admin, 'create', any('User'))).resolves.toBe(true);
            await expect(roles.can(rh, 'create', any('User'))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', any('User'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('User'))).resolves.toBe(false);
        });
        test('can be updated only by "admin"', async () => {
            await expect(roles.can(admin, 'update', any('User'))).resolves.toBe(true);
            await expect(roles.can(rh, 'update', any('User'))).resolves.toBe(false);
            await expect(roles.can(employee, 'update', any('User'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('User'))).resolves.toBe(false);
        });
    });
    describe('Own user', () => {
        test('can be updated only by "admin"', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('User', {id: admin.id}), '*')).resolves.toBe(true);
            await expect(roles.can(rh, 'update', RolesService.object('User', {id: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('User', {id: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('User', {id: manager.id}), '*')).resolves.toBe(false);
        });
        test('can be detailed by anyone', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('User', {id: admin.id}))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', RolesService.object('User', {id: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('User', {id: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('User', {id: manager.id}))).resolves.toBe(true);
        });
        test('password can be updated by anyone', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('User', {id: admin.id}), 'password')).resolves.toBe(true);
            await expect(roles.can(rh, 'update', RolesService.object('User', {id: rh.id}), 'password')).resolves.toBe(true);
            await expect(roles.can(employee, 'update', RolesService.object('User', {id: employee.id}), 'password')).resolves.toBe(true);
            await expect(roles.can(manager, 'update', RolesService.object('User', {id: manager.id}), 'password')).resolves.toBe(true);
        });
    });
    describe('Employees', () => {
        test('can be updated only by "rh"', async () => {
            const employeeObject = RolesService.object('Employee', employee);
            await expect(roles.can(admin, 'update', employeeObject)).resolves.toBe(false);
            await expect(roles.can(rh, 'update', employeeObject)).resolves.toBe(true);
            await expect(roles.can(employee, 'update', employeeObject)).resolves.toBe(false);
            await expect(roles.can(manager, 'update', employeeObject)).resolves.toBe(false);
        });
    });
    describe('me (own user alias)', () => {
        const me = RolesService.object('User', {id: 'me'});
        test('can be updated only by "admin"', async () => {
            await expect(roles.can(admin, 'update', me, '*')).resolves.toBe(true);
            await expect(roles.can(rh, 'update', me, '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', me, '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', me, '*')).resolves.toBe(false);
        });
        test('can be detailed by anyone', async () => {
            await expect(roles.can(admin, 'detail', me)).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', me)).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', me)).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', me)).resolves.toBe(true);
        });
    });
    describe('Account responsible user', () => {
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('User', {id: responsible.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('User', {id: responsible.id}))).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('User', {id: responsible.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('User', {id: responsible.id}))).resolves.toBe(false);
        });
    });

    describe('Employees', () => {
        test('can be listed by anyone', async () => {
            await expect(roles.can(admin, 'list', any('Employee'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', any('Employee'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Employee'))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', any('Employee'))).resolves.toBe(true);
        });
        test('can be listed by "manager" above them', async () => {
            await expect(roles.can(manager, 'list', RolesService.object('Employee', {sector: 'root'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Employee', {sector: 'right'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Employee', {sector: 'left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Employee', {sector: 'sub-left'}))).resolves.toBe(true);
        });
        test('can be listed by anyone on same sector', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Employee', {sector: admin.sector}))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', RolesService.object('Employee', {sector: rh.sector}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Employee', {sector: employee.sector}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Employee', {sector: manager.sector}))).resolves.toBe(true);
        });
        test('can be detailed by anyone', async () => {
            await expect(roles.can(admin, 'detail', any('Employee'))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', any('Employee'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Employee'))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', any('Employee'))).resolves.toBe(true);
        });
        test('avatarUrl be updated only by "rh"', async () => {
            await expect(roles.can(admin, 'update', any('Employee'), 'avatarUrl')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', any('Employee'), 'avatarUrl')).resolves.toBe(true);
            await expect(roles.can(employee, 'update', any('Employee'), 'avatarUrl')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Employee'), 'avatarUrl')).resolves.toBe(false);
        });
    });

    describe('Employees fields', () => {
        test('all can be viewd only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', 'Employee', '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', 'Employee', '*')).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', 'Employee', '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', 'Employee', '*')).resolves.toBe(false);
        });
        test.each(['effective', 'birthday', 'effectivated_at', 'dismissed_at', 'hired_at', 'register'])('"%s" can be viewd only by "rh"', async (field) => {
            await expect(roles.can(admin, 'detail', 'Employee', field)).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', 'Employee', field)).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', 'Employee', field)).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', 'Employee', field)).resolves.toBe(false);
        });
        test.each(['id', 'name', 'sector', 'rank', 'disabled', 'email', 'mobile_phone'])('"%s" can be viewd by anyone', async (field) => {
            await expect(roles.can(admin, 'detail', 'Employee', field)).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', 'Employee', field)).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', 'Employee', field)).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', 'Employee', field)).resolves.toBe(true);
        });

        describe('access', () => {
            test('all only to "rh"', async () => {
                await expect(roles.allowedKeys(admin, 'detail', 'Employee', generateEmployee(true))).resolves.toEqual(generateEmployee());
                await expect(roles.allowedKeys(rh, 'detail', 'Employee', generateEmployee(true))).resolves.toEqual(generateEmployee(true));
                await expect(roles.allowedKeys(employee, 'detail', 'Employee', generateEmployee(true))).resolves.toEqual(generateEmployee());
                await expect(roles.allowedKeys(manager, 'detail', 'Employee', generateEmployee(true))).resolves.toEqual(generateEmployee(false, true));
            });

            test('subordinate employee with "working_days" field', async () => {
                await expect(roles.allowedKeys(manager, 'detail', 'Employee', generateEmployee(true, true, 'left'))).resolves.toEqual(generateEmployee(false, true, 'left'));
            });
        });
    });

    describe('Ranks', () => {
        test('can be listed by "admin" and "rh"', async () => {
            await expect(roles.can(admin, 'list', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Rank'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('Rank'))).resolves.toBe(false);
        });
        test('can be detailed by every one', async () => {
            await expect(roles.can(admin, 'detail', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', any('Rank'))).resolves.toBe(true);
        });
        test('can be created by "admin" and "rh"', async () => {
            await expect(roles.can(admin, 'create', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(rh, 'create', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', any('Rank'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('Rank'))).resolves.toBe(false);
        });
        test('can be updated by "admin" and "rh"', async () => {
            await expect(roles.can(admin, 'update', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(rh, 'update', any('Rank'))).resolves.toBe(true);
            await expect(roles.can(employee, 'update', any('Rank'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Rank'))).resolves.toBe(false);
        });
    });

    describe('Trainings', () => {
        test('can be listed by every one', async () => {
            await expect(roles.can(admin, 'list', any('Training'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', RolesService.object('Training', {disabled: false}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Training', {disabled: false}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Training', {disabled: false}))).resolves.toBe(true);
        });
        test('can be detailed by every one', async () => {
            await expect(roles.can(admin, 'detail', any('Training'))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', RolesService.object('Training', {disabled: false}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Training', {disabled: false}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Training', {disabled: false}))).resolves.toBe(true);
        });
        test('can be created by "admin"', async () => {
            await expect(roles.can(admin, 'create', any('Training'))).resolves.toBe(true);
            await expect(roles.can(rh, 'create', any('Training'))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', any('Training'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('Training'))).resolves.toBe(false);
        });
        test('can be updated by "admin"', async () => {
            await expect(roles.can(admin, 'update', any('Training'))).resolves.toBe(true);
            await expect(roles.can(rh, 'update', any('Training'))).resolves.toBe(false);
            await expect(roles.can(employee, 'update', any('Training'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Training'))).resolves.toBe(false);
        });
    });

    describe('TrainingTrails', () => {
        test('can be listed by every one', async () => {
            await expect(roles.can(admin, 'list', any('TrainingTrail'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', RolesService.object('TrainingTrail', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('TrainingTrail', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('TrainingTrail', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be detailed by every one', async () => {
            await expect(roles.can(admin, 'detail', any('TrainingTrail'))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', RolesService.object('TrainingTrail', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('TrainingTrail', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('TrainingTrail', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be created by "admin"', async () => {
            await expect(roles.can(admin, 'create', any('TrainingTrail'))).resolves.toBe(true);
            await expect(roles.can(rh, 'create', any('TrainingTrail'))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', any('TrainingTrail'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('TrainingTrail'))).resolves.toBe(false);
        });
        test('can be updated by "admin"', async () => {
            await expect(roles.can(admin, 'update', any('TrainingTrail'))).resolves.toBe(true);
            await expect(roles.can(rh, 'update', any('TrainingTrail'))).resolves.toBe(false);
            await expect(roles.can(employee, 'update', any('TrainingTrail'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('TrainingTrail'))).resolves.toBe(false);
        });
    });

    describe('TrainingProgresses to oneself', () => {
        test('can be listed by anyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('TrainingProgress', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('TrainingProgress', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('TrainingProgress', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('TrainingProgress', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be detailed by anyone but admin', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('TrainingProgress', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('TrainingProgress', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('TrainingProgress', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('TrainingProgress', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be created by anyone but admin', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('TrainingProgress', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('TrainingProgress', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', RolesService.object('TrainingProgress', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('TrainingProgress', {employee: manager.id}))).resolves.toBe(true);
        });
    });

    describe('TrainingProgresses', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', any('TrainingProgress'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('TrainingProgress'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('TrainingProgress'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('TrainingProgress'))).resolves.toBe(false);
        });
        test('can be detailed only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', any('TrainingProgress'))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', any('TrainingProgress'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('TrainingProgress'))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', any('TrainingProgress'))).resolves.toBe(false);
        });
        test('can be created by no one', async () => {
            await expect(roles.can(manager, 'create', RolesService.object('TrainingProgress', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('TrainingProgress', {sector: 'sub-left'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('TrainingProgress', {sector: 'left'}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('TrainingProgress', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('TrainingProgress', {sector: 'sub-left'}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('TrainingProgress', {sector: 'left'}))).resolves.toBe(false);
        });
        test('can be read by "manager" above it', async () => {
            await expect(roles.can(manager, 'list', RolesService.object('TrainingProgress', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('TrainingProgress', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('TrainingProgress', {sector: 'left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('TrainingProgress', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('TrainingProgress', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('TrainingProgress', {sector: 'left'}))).resolves.toBe(true);
        });
    });

    describe('Contents', () => {
        test('can be listed by "admin"', async () => {
            await expect(roles.can(admin, 'list', any('Content'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', any('Content'))).resolves.toBe(false);
            await expect(roles.can(employee, 'list', any('Content'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('Content'))).resolves.toBe(false);
        });
        test('can be detailed by anyone', async () => {
            await expect(roles.can(admin, 'detail', any('Content'))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', any('Content'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Content'))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', any('Content'))).resolves.toBe(true);
        });
        test('can be created by "admin"', async () => {
            await expect(roles.can(admin, 'create', any('Content'))).resolves.toBe(true);
            await expect(roles.can(rh, 'create', any('Content'))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', any('Content'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('Content'))).resolves.toBe(false);
        });
        test('can be updated by "admin"', async () => {
            await expect(roles.can(admin, 'update', any('Content'))).resolves.toBe(true);
            await expect(roles.can(rh, 'update', any('Content'))).resolves.toBe(false);
            await expect(roles.can(employee, 'update', any('Content'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Content'))).resolves.toBe(false);
        });
    });

    describe('Sectors', () => {
        test('can be detailed by anyone', async () => {
            await expect(roles.can(admin, 'detail', any('Sector'))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', any('Sector'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Sector'))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', any('Sector'))).resolves.toBe(true);
        });
        test('can be created by "admin" and "rh"', async () => {
            await expect(roles.can(admin, 'create', any('Sector'))).resolves.toBe(true);
            await expect(roles.can(rh, 'create', any('Sector'))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', any('Sector'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('Sector'))).resolves.toBe(false);
        });
        test('can be updated by "admin" and "rh"', async () => {
            await expect(roles.can(admin, 'update', any('Sector'))).resolves.toBe(true);
            await expect(roles.can(rh, 'update', any('Sector'))).resolves.toBe(true);
            await expect(roles.can(employee, 'update', any('Sector'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Sector'))).resolves.toBe(false);
        });
    });

    describe('Feedbacks to oneself', () => {
        test('can be listed by anyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Feedback', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Feedback', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Feedback', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Feedback', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be detailed by anyone but admin', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Feedback', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Feedback', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Feedback', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Feedback', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be listed by creator', async () => {
            await expect(roles.can(employeeRight, 'list', RolesService.object('Feedback', {employee: employeeLeft.id, created_by: employeeRight.id}))).resolves.toBe(true);
            await expect(roles.can(employeeLeft, 'list', RolesService.object('Feedback', {employee: employeeRight.id, created_by: employeeLeft.id}))).resolves.toBe(true);
        });
        test('can be detailed by creator', async () => {
            await expect(roles.can(employeeRight, 'detail', RolesService.object('Feedback', {employee: employeeLeft.id, created_by: employeeRight.id}))).resolves.toBe(true);
            await expect(roles.can(employeeLeft, 'detail', RolesService.object('Feedback', {employee: employeeRight.id, created_by: employeeLeft.id}))).resolves.toBe(true);
        });
        test('can be created by no one', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('Feedback', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('Feedback', {employee: rh.id}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('Feedback', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Feedback', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('Feedback', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('Feedback', {employee: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('Feedback', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('Feedback', {employee: manager.id}), '*')).resolves.toBe(false);
        });
        test('can be mark as "read" by anyone but admin', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('Feedback', {employee: admin.id}), 'read')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('Feedback', {employee: rh.id}), 'read')).resolves.toBe(true);
            await expect(roles.can(employee, 'update', RolesService.object('Feedback', {employee: employee.id}), 'read')).resolves.toBe(true);
            await expect(roles.can(manager, 'update', RolesService.object('Feedback', {employee: manager.id}), 'read')).resolves.toBe(true);
        });
    });
    describe('Feedback to teamate', () => {
        test('can be created by anyone but admin', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('Feedback', {sector: admin.sector}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('Feedback', {sector: rh.sector}))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', RolesService.object('Feedback', {sector: employee.sector}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('Feedback', {sector: manager.sector}))).resolves.toBe(true);
        });
    });
    describe('Feedback pending approval', () => {
        test('can be listed by manager above or rh', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(employeeManager, 'list', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(true);
        });
        test('cannot be listed by target employee', async () => {
            await expect(roles.can(rh, 'list', RolesService.object('Feedback', {employee: rh.id, sector: rh.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(employee, 'list', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Feedback', {employee: manager.id, sector: manager.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
        });
        test('can be detailed by manager above or rh', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(employeeManager, 'detail', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(true);
        });
        test('cannot be detailed by target employee', async () => {
            await expect(roles.can(rh, 'detail', RolesService.object('Feedback', {employee: rh.id, sector: rh.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(employee, 'detail', RolesService.object('Feedback', {employee: employee.id, sector: employee.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('Feedback', {employee: manager.id, sector: manager.sector, status: FeedbackStatus.pending_approval}))).resolves.toBe(false);
        });
    });
    describe('Feedbacks', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('Feedback'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('Feedback'))).resolves.toBe(false);
        });
        test('can be detailed by anyone but admin', async () => {
            await expect(roles.can(admin, 'detail', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', any('Feedback'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', any('Feedback'))).resolves.toBe(false);
        });
        test('can be created by anyone', async () => {
            await expect(roles.can(manager, 'create', RolesService.object('Feedback', {sector: 'root'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('Feedback', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('Feedback', {sector: 'left'}))).resolves.toBe(true);

            await expect(roles.can(employee, 'create', RolesService.object('Feedback', {sector: 'root'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', RolesService.object('Feedback', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', RolesService.object('Feedback', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be read by "manager"', async () => {
            await expect(roles.can(manager, 'list', RolesService.object('Feedback', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Feedback', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Feedback', {sector: 'left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Feedback', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('Feedback', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Feedback', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(rh, 'update', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(employee, 'update', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Feedback'))).resolves.toBe(false);
        });
        test('can be deleted by no one', async () => {
            await expect(roles.can(admin, 'delete', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(rh, 'delete', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(employee, 'delete', any('Feedback'))).resolves.toBe(false);
            await expect(roles.can(manager, 'delete', any('Feedback'))).resolves.toBe(false);
        });
    });

    describe('CoachingRegisters to oneself', () => {
        test('can be listed by anyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('CoachingRegister', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('CoachingRegister', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('CoachingRegister', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('CoachingRegister', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be detailed by anyone but admin', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('CoachingRegister', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('CoachingRegister', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('CoachingRegister', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('CoachingRegister', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be created by no one', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('CoachingRegister', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('CoachingRegister', {employee: rh.id}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('CoachingRegister', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegister', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('CoachingRegister', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('CoachingRegister', {employee: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('CoachingRegister', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegister', {employee: manager.id}), '*')).resolves.toBe(false);
        });
        test('can be mark as "read" by anyone but admin', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('CoachingRegister', {employee: admin.id}), 'read')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('CoachingRegister', {employee: rh.id}), 'read')).resolves.toBe(true);
            await expect(roles.can(employee, 'update', RolesService.object('CoachingRegister', {employee: employee.id}), 'read')).resolves.toBe(true);
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegister', {employee: manager.id}), 'read')).resolves.toBe(true);
        });
    });
    describe('CoachingRegisters', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('CoachingRegister'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('CoachingRegister'))).resolves.toBe(false);
        });
        test('can be detailed only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', any('CoachingRegister'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', any('CoachingRegister'))).resolves.toBe(false);
        });
        test('can be created by "manager" above', async () => {
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegister', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegister', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegister', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be read by "manager" above', async () => {
            await expect(roles.can(manager, 'list', RolesService.object('CoachingRegister', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('CoachingRegister', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('CoachingRegister', {sector: 'left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('CoachingRegister', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('CoachingRegister', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('CoachingRegister', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(rh, 'update', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(employee, 'update', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('CoachingRegister'))).resolves.toBe(false);
        });
        test('can be deleted by no one', async () => {
            await expect(roles.can(admin, 'delete', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(rh, 'delete', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(employee, 'delete', any('CoachingRegister'))).resolves.toBe(false);
            await expect(roles.can(manager, 'delete', any('CoachingRegister'))).resolves.toBe(false);
        });
    });

    describe('CoachingRegisterTodos to oneself', () => {
        test('can be created by no one', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('CoachingRegisterTodo', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('CoachingRegisterTodo', {employee: rh.id}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('CoachingRegisterTodo', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegisterTodo', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('CoachingRegisterTodo', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('CoachingRegisterTodo', {employee: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('CoachingRegisterTodo', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegisterTodo', {employee: manager.id}), '*')).resolves.toBe(false);
        });
        test('can be deleted by no one', async () => {
            await expect(roles.can(admin, 'delete', RolesService.object('CoachingRegisterTodo', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'delete', RolesService.object('CoachingRegisterTodo', {employee: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'delete', RolesService.object('CoachingRegisterTodo', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'delete', RolesService.object('CoachingRegisterTodo', {employee: manager.id}), '*')).resolves.toBe(false);
        });
        test('can be completed by anyone but admin', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('CoachingRegisterTodo', {employee: admin.id}), 'completed_at')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('CoachingRegisterTodo', {employee: rh.id}), 'completed_at')).resolves.toBe(true);
            await expect(roles.can(employee, 'update', RolesService.object('CoachingRegisterTodo', {employee: employee.id}), 'completed_at')).resolves.toBe(true);
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegisterTodo', {employee: manager.id}), 'completed_at')).resolves.toBe(true);
        });
    });
    describe('Others CoachingRegisterTodos', () => {
        test('can be completed by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('CoachingRegisterTodo', {employee: other.id}), 'completed_at')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('CoachingRegisterTodo', {employee: other.id}), 'completed_at')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('CoachingRegisterTodo', {employee: other.id}), 'completed_at')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegisterTodo', {employee: other.id}), 'completed_at')).resolves.toBe(false);
        });
    });
    describe('CoachingRegisterTodos', () => {
        test('cannot be created by any "manager" above', async () => {
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegisterTodo', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegisterTodo', {sector: 'sub-left'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('CoachingRegisterTodo', {sector: 'left'}))).resolves.toBe(false);
        });
        test('cannot be updated by any "manager" above', async () => {
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegisterTodo', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegisterTodo', {sector: 'sub-left'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('CoachingRegisterTodo', {sector: 'left'}))).resolves.toBe(false);
        });
        test('cannot be deleted by any "manager" above', async () => {
            await expect(roles.can(manager, 'delete', RolesService.object('CoachingRegisterTodo', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'delete', RolesService.object('CoachingRegisterTodo', {sector: 'sub-left'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'delete', RolesService.object('CoachingRegisterTodo', {sector: 'left'}))).resolves.toBe(false);
        });
    });

    describe('Evaluations to oneself', () => {
        test('can be created by no one', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('Evaluation', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('Evaluation', {employee: rh.id}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('Evaluation', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Evaluation', {employee: manager.id}))).resolves.toBe(false);
            await expect(roles.can(rhManager, 'create', RolesService.object('Evaluation', {employee: rhManager.id}))).resolves.toBe(false);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('Evaluation', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('Evaluation', {employee: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('Evaluation', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('Evaluation', {employee: manager.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rhManager, 'update', RolesService.object('Evaluation', {employee: rhManager.id}), '*')).resolves.toBe(false);
        });
        test('can be mark as "read" by anyone but admin', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('Evaluation', {employee: admin.id}), 'read')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('Evaluation', {employee: rh.id}), 'read')).resolves.toBe(true);
            await expect(roles.can(employee, 'update', RolesService.object('Evaluation', {employee: employee.id}), 'read')).resolves.toBe(true);
            await expect(roles.can(manager, 'update', RolesService.object('Evaluation', {employee: manager.id}), 'read')).resolves.toBe(true);
            await expect(roles.can(rhManager, 'update', RolesService.object('Evaluation', {employee: rhManager.id}), 'read')).resolves.toBe(true);
        });
    });
    describe('Evaluations "decision-matrix" to oneself', () => {
        test('cannot be listed by no one if not disclosed', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Evaluation', {employee: admin.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Evaluation', {employee: rh.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(employee, 'list', RolesService.object('Evaluation', {employee: employee.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Evaluation', {employee: manager.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(rhManager, 'list', RolesService.object('Evaluation', {employee: rhManager.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
        });
        test('cannot be detailed by no one if not disclosed', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Evaluation', {employee: admin.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Evaluation', {employee: rh.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(employee, 'detail', RolesService.object('Evaluation', {employee: employee.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('Evaluation', {employee: manager.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(rhManager, 'detail', RolesService.object('Evaluation', {employee: rhManager.id, disclosed_to_employee: false, type: 'decision-matrix'}))).resolves.toBe(false);
        });
        test('can be listed if disclosed', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Evaluation', {employee: admin.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Evaluation', {employee: rh.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Evaluation', {employee: employee.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Evaluation', {employee: manager.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('Evaluation', {employee: rhManager.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
        });
        test('can be detailed if disclosed', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Evaluation', {employee: admin.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Evaluation', {employee: rh.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Evaluation', {employee: employee.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Evaluation', {employee: manager.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', RolesService.object('Evaluation', {employee: rhManager.id, disclosed_to_employee: true, type: 'decision-matrix'}))).resolves.toBe(true);
        });
    });
    describe('Evaluations "ape" to oneself', () => {
        test('can be listed by anyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Evaluation', {employee: admin.id, type: 'ape'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Evaluation', {employee: rh.id, type: 'ape'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Evaluation', {employee: employee.id, type: 'ape'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Evaluation', {employee: manager.id, type: 'ape'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('Evaluation', {employee: rhManager.id, type: 'ape'}))).resolves.toBe(true);
        });
        test('can be detailed by anyone but admin', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Evaluation', {employee: admin.id, type: 'ape'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Evaluation', {employee: rh.id, type: 'ape'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Evaluation', {employee: employee.id, type: 'ape'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Evaluation', {employee: manager.id, type: 'ape'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', RolesService.object('Evaluation', {employee: rhManager.id, type: 'ape'}))).resolves.toBe(true);
        });
    });
    describe('Evaluations', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', any('Evaluation'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('Evaluation'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Evaluation'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('Evaluation'))).resolves.toBe(false);
            await expect(roles.can(rhManager, 'list', any('Evaluation'))).resolves.toBe(true);
        });
        test('can be detailed only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', any('Evaluation'))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', any('Evaluation'))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', any('Evaluation'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Evaluation'))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', any('Evaluation'))).resolves.toBe(false);
        });
        test('cannot be detailed if not responsible', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Evaluation', {responsible: null}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Evaluation', {responsible: null}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Evaluation', {responsible: employee.id, employee: admin.id, id: 'foo', sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Evaluation', {responsible: null}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('Evaluation', {responsible: manager.id}))).resolves.toBe(true);
        });
        test('can be created by "rh"', async () => {
            await expect(roles.can(rh, 'create', any('Evaluation'))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'create', RolesService.object('Evaluation', {sector: 'root'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'create', RolesService.object('Evaluation', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'create', RolesService.object('Evaluation', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be updated by "rh"', async () => {
            await expect(roles.can(rh, 'update', any('Evaluation'))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'update', RolesService.object('Evaluation', {sector: 'root'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'update', RolesService.object('Evaluation', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'update', RolesService.object('Evaluation', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be created by "manager" above', async () => {
            await expect(roles.can(manager, 'create', RolesService.object('Evaluation', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Evaluation', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('Evaluation', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be updated by "manager" above', async () => {
            await expect(roles.can(manager, 'update', RolesService.object('Evaluation', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('Evaluation', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'update', RolesService.object('Evaluation', {sector: 'left'}))).resolves.toBe(true);
        });
    });

    describe('Evaluations "decision-matrix"', () => {
        test('can be listed by manager above', async () => {
            // await expect(roles.can(manager, 'list', RolesService.object('Evaluation', {sector: 'root', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Evaluation', {sector: 'sub-left', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Evaluation', {sector: 'left', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
        });
        test('can be detailed by manager above', async () => {
            // await expect(roles.can(manager, 'detail', RolesService.object('Evaluation', {sector: 'root', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('Evaluation', {sector: 'sub-left', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Evaluation', {sector: 'left', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
        });
        test('can be listed by rh', async () => {
            await expect(roles.can(rh, 'list', RolesService.object('Evaluation', {sector: 'root', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', RolesService.object('Evaluation', {sector: 'sub-left', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', RolesService.object('Evaluation', {sector: 'left', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('Evaluation', {sector: 'root', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('Evaluation', {sector: 'sub-left', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('Evaluation', {sector: 'left', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('Evaluation', {sector: 'right', type: EvaluationType.decision_matrix, employee: andOther.id}))).resolves.toBe(true);
        });
        test('can be detailed by rh', async () => {
            await expect(roles.can(rh, 'detail', RolesService.object('Evaluation', {sector: 'root', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', RolesService.object('Evaluation', {sector: 'sub-left', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
            await expect(roles.can(rh, 'detail', RolesService.object('Evaluation', {sector: 'left', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', RolesService.object('Evaluation', {sector: 'root', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', RolesService.object('Evaluation', {sector: 'sub-left', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', RolesService.object('Evaluation', {sector: 'left', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', RolesService.object('Evaluation', {sector: 'right', type: EvaluationType.decision_matrix, employee: andOther.id, responsible: 'foo'}))).resolves.toBe(true);
        });
    });

    describe('EvaluationsSchedulers', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', any('EvaluationsScheduler'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('EvaluationsScheduler'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('EvaluationsScheduler'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('EvaluationsScheduler'))).resolves.toBe(false);
        });
        test('can be detailed only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', any('EvaluationsScheduler'))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', any('EvaluationsScheduler'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('EvaluationsScheduler'))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', any('EvaluationsScheduler'))).resolves.toBe(false);
        });
        test('can be created by "rh"', async () => {
            await expect(roles.can(rh, 'create', any('EvaluationsScheduler'))).resolves.toBe(true);
        });
        test('can be updated by "rh"', async () => {
            await expect(roles.can(rh, 'update', any('EvaluationsScheduler'))).resolves.toBe(true);
        });
        test('can be created by "manager" above', async () => {
            await expect(roles.can(manager, 'create', RolesService.object('EvaluationsScheduler', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('EvaluationsScheduler', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('EvaluationsScheduler', {sector: 'left'}))).resolves.toBe(true);
        });
        test('can be updated by "manager" above', async () => {
            await expect(roles.can(manager, 'update', RolesService.object('EvaluationsScheduler', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('EvaluationsScheduler', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'update', RolesService.object('EvaluationsScheduler', {sector: 'left'}))).resolves.toBe(true);
        });
    });

    describe.skip('Some ClimateChecks results', () => {
        test('can be viewed by "rh" & "manager', async () => {
            await expect(roles.can(admin, 'list', any('ClimateCheck'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('ClimateCheck'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('ClimateCheck'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('ClimateCheck'))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', any('ClimateCheck'))).resolves.toBe(true);
        });
    });

    describe('Other\'s ClimateChecks answers', () => {
        test('can be checked by no one', async () => {
            const othersAnswer = RolesService.object('ClimateCheck', {employee: other.id});
            await expect(roles.can(admin, 'list', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(rh, 'list', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(employee, 'list', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(manager, 'list', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(rhManager, 'list', othersAnswer)).resolves.toBe(false);
        });
        test('can be submitted by no one', async () => {
            const othersAnswer = RolesService.object('ClimateCheck', {employee: other.id});
            await expect(roles.can(admin, 'create', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(rh, 'create', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(employee, 'create', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(manager, 'create', othersAnswer)).resolves.toBe(false);
            await expect(roles.can(rhManager, 'create', othersAnswer)).resolves.toBe(false);
        });
    });
    describe('Own ClimateChecks answers', () => {
        test('can be checked by anyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('ClimateCheck', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('ClimateCheck', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('ClimateCheck', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('ClimateCheck', {employee: manager.id}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('ClimateCheck', {employee: rhManager.id}))).resolves.toBe(true);
        });
        test('can be submitted by anyone but admin', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('ClimateCheck', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('ClimateCheck', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', RolesService.object('ClimateCheck', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'create', RolesService.object('ClimateCheck', {employee: manager.id}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'create', RolesService.object('ClimateCheck', {employee: rhManager.id}))).resolves.toBe(true);
        });
    });
    describe('Sectors ClimateChecks results', () => {
        test('can be viewed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('ClimateCheck', {sector: 'right'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('ClimateCheck', {sector: 'right'}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('ClimateCheck', {sector: 'right'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('ClimateCheck', {sector: 'right'}))).resolves.toBe(false);
            await expect(roles.can(rhManager, 'list', RolesService.object('ClimateCheck', {sector: 'right'}))).resolves.toBe(true);
        });
        test('can be viewed by "manager" above', async () => {
            await expect(roles.can(manager, 'list', RolesService.object('ClimateCheck', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('ClimateCheck', {sector: 'right'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('ClimateCheck', {sector: 'left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('ClimateCheck', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(rhManager, 'list', RolesService.object('ClimateCheck', {sector: 'sub-left'}))).resolves.toBe(true);
        });
    });

    describe('Sectors ClimateChecks history', () => {
        test('can be viewed only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('ClimateCheck', {sector: 'right'}), 'history')).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('ClimateCheck', {sector: 'right'}), 'history')).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('ClimateCheck', {sector: 'right'}), 'history')).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('ClimateCheck', {sector: 'right'}), 'history')).resolves.toBe(false);
            await expect(roles.can(rhManager, 'detail', RolesService.object('ClimateCheck', {sector: 'right'}), 'history')).resolves.toBe(true);
        });
        test('can be viewed by "manager" above', async () => {
            await expect(roles.can(manager, 'detail', RolesService.object('ClimateCheck', {sector: 'root'}), 'history')).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('ClimateCheck', {sector: 'right'}), 'history')).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('ClimateCheck', {sector: 'left'}), 'history')).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('ClimateCheck', {sector: 'sub-left'}), 'history')).resolves.toBe(true);
            await expect(roles.can(rhManager, 'detail', RolesService.object('ClimateCheck', {sector: 'sub-left'}), 'history')).resolves.toBe(true);
        });
    });

    describe('Reprimands to oneself', () => {
        test('can be listed by everyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Reprimand', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Reprimand', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Reprimand', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Reprimand', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be listed by everyone but admin when "SENT"', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Reprimand', {employee: admin.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Reprimand', {employee: rh.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Reprimand', {employee: employee.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Reprimand', {employee: manager.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(true);
        });
        test('can be detailed by everyone but admin', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Reprimand', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Reprimand', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Reprimand', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Reprimand', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be detailed by everyone but admin when "SENT"', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Reprimand', {employee: admin.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Reprimand', {employee: rh.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Reprimand', {employee: employee.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Reprimand', {employee: manager.id, status: REPRIMAND_STATUS.SENT}))).resolves.toBe(true);
        });
        test('can be created by no one', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('Reprimand', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('Reprimand', {employee: rh.id}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('Reprimand', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Reprimand', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('Reprimand', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('Reprimand', {employee: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('Reprimand', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('Reprimand', {employee: manager.id}), '*')).resolves.toBe(false);
        });
    });
    describe('Reprimands', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', any('Reprimand'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('Reprimand'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Reprimand'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('Reprimand'))).resolves.toBe(false);
        });
        test('can be detailed only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', any('Reprimand'))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', any('Reprimand'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Reprimand'))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', any('Reprimand'))).resolves.toBe(false);
        });
        test('can be managed by "manager" above it', async () => {
            await expect(roles.can(manager, 'manage', RolesService.object('Reprimand', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'manage', RolesService.object('Reprimand', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'manage', RolesService.object('Reprimand', {sector: 'left'}))).resolves.toBe(true);
        });
    });

    describe('Suspensions to oneself', () => {
        test('can be listed by everyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Suspension', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Suspension', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Suspension', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Suspension', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be listed by everyone but admin when "SENT"', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Suspension', {employee: admin.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Suspension', {employee: rh.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Suspension', {employee: employee.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Suspension', {employee: manager.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(true);
        });
        test('can be detailed by everyone but admin', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Suspension', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Suspension', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Suspension', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Suspension', {employee: manager.id}))).resolves.toBe(true);
        });
        test('can be detailed by everyone but admin when "SENT"', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Suspension', {employee: admin.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Suspension', {employee: rh.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Suspension', {employee: employee.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Suspension', {employee: manager.id, status: SUSPENSION_STATUS.SENT}))).resolves.toBe(true);
        });
        test('can be created by no one', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('Suspension', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('Suspension', {employee: rh.id}))).resolves.toBe(false);
            await expect(roles.can(employee, 'create', RolesService.object('Suspension', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Suspension', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be updated by no one', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('Suspension', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('Suspension', {employee: rh.id}), '*')).resolves.toBe(false);
            await expect(roles.can(employee, 'update', RolesService.object('Suspension', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('Suspension', {employee: manager.id}), '*')).resolves.toBe(false);
        });
    });
    describe('Suspensions', () => {
        test('can be created only by "rh"', async () => {
            await expect(roles.can(admin, 'create', any('Suspension'))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', any('Suspension'))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', any('Suspension'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('Suspension'))).resolves.toBe(false);
        });
        test('can be updated only by "rh"', async () => {
            await expect(roles.can(admin, 'update', any('Suspension'))).resolves.toBe(false);
            await expect(roles.can(rh, 'update', any('Suspension'))).resolves.toBe(true);
            await expect(roles.can(employee, 'update', any('Suspension'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Suspension'))).resolves.toBe(false);
        });
        test('can be viewed by "manager" above it', async () => {
            await expect(roles.can(manager, 'list', RolesService.object('Suspension', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Suspension', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Suspension', {sector: 'left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Suspension', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('Suspension', {sector: 'sub-left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', RolesService.object('Suspension', {sector: 'left'}))).resolves.toBe(true);
        });
    });

    describe('Vacations to oneself', () => {
        test('can be listed by "rh" only', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Vacation', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Vacation', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Vacation', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Vacation', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be detailed by "rh" only', async () => {
            await expect(roles.can(admin, 'detail', RolesService.object('Vacation', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', RolesService.object('Vacation', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', RolesService.object('Vacation', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', RolesService.object('Vacation', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be created by "rh" only', async () => {
            await expect(roles.can(admin, 'create', RolesService.object('Vacation', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', RolesService.object('Vacation', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', RolesService.object('Vacation', {employee: employee.id}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Vacation', {employee: manager.id}))).resolves.toBe(false);
        });
        test('can be updated by "rh" only', async () => {
            await expect(roles.can(admin, 'update', RolesService.object('Vacation', {employee: admin.id}), '*')).resolves.toBe(false);
            await expect(roles.can(rh, 'update', RolesService.object('Vacation', {employee: rh.id}), '*')).resolves.toBe(true);
            await expect(roles.can(employee, 'update', RolesService.object('Vacation', {employee: employee.id}), '*')).resolves.toBe(false);
            await expect(roles.can(manager, 'update', RolesService.object('Vacation', {employee: manager.id}), '*')).resolves.toBe(false);
        });
    });
    describe('Vacations', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', any('Vacation'))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', any('Vacation'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Vacation'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('Vacation'))).resolves.toBe(false);
        });
        test('can be detailed only by "rh"', async () => {
            await expect(roles.can(admin, 'detail', any('Vacation'))).resolves.toBe(false);
            await expect(roles.can(rh, 'detail', any('Vacation'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Vacation'))).resolves.toBe(false);
            await expect(roles.can(manager, 'detail', any('Vacation'))).resolves.toBe(false);
        });
        test('can be created by "manager" above it', async () => {
            await expect(roles.can(manager, 'create', RolesService.object('Vacation', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Vacation', {sector: 'sub-left'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', RolesService.object('Vacation', {sector: 'left'}))).resolves.toBe(false);
        });
    });

    describe('Templates', () => {
        test('can be created only by "rh"', async () => {
            await expect(roles.can(admin, 'crete', any('Template'))).resolves.toBe(false);
            await expect(roles.can(rh, 'create', any('Template'))).resolves.toBe(true);
            await expect(roles.can(employee, 'create', any('Template'))).resolves.toBe(false);
            await expect(roles.can(manager, 'create', any('Template'))).resolves.toBe(false);
        });
        test('can be updated only by "rh"', async () => {
            await expect(roles.can(admin, 'update', any('Template'))).resolves.toBe(false);
            await expect(roles.can(rh, 'update', any('Template'))).resolves.toBe(true);
            await expect(roles.can(employee, 'update', any('Template'))).resolves.toBe(false);
            await expect(roles.can(manager, 'update', any('Template'))).resolves.toBe(false);
        });
        test('can be detail by anyone', async () => {
            await expect(roles.can(rh, 'detail', any('Template'))).resolves.toBe(true);
            await expect(roles.can(employee, 'detail', any('Template'))).resolves.toBe(true);
            await expect(roles.can(manager, 'detail', any('Template'))).resolves.toBe(true);
        });
        test('can be listed by anyone', async () => {
            await expect(roles.can(rh, 'list', any('Template'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Template'))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', any('Template'))).resolves.toBe(true);
        });
    });

    describe('Own PendingActions', () => {
        test('can be listed by anyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('PendingAction', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('PendingAction', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('PendingAction', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('PendingAction', {employee: manager.id}))).resolves.toBe(true);
        });
    });

    describe('PendingActions', () => {
        test('can be listed by no one', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('PendingAction', {}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('PendingAction', {}))).resolves.toBe(false);
            await expect(roles.can(employee, 'list', RolesService.object('PendingAction', {}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('PendingAction', {}))).resolves.toBe(false);
        });
    });

    describe('Own Timelines', () => {
        test('can be listed by anyone but admin', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Timeline', {employee: admin.id}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Timeline', {employee: rh.id}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Timeline', {employee: employee.id}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {employee: manager.id}))).resolves.toBe(true);
        });

        test('can be listed multidirectional by anyone but admin when "done"', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Timeline', {employee: admin.id, type: 'Evaluation.Multidirectional', status: EvaluationStatus.done}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Timeline', {employee: rh.id, type: 'Evaluation.Multidirectional', status: EvaluationStatus.done}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Timeline', {employee: employee.id, type: 'Evaluation.Multidirectional', status: EvaluationStatus.done}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {employee: manager.id, type: 'Evaluation.Multidirectional', status: EvaluationStatus.done}))).resolves.toBe(true);
        });

        test('can\'t list decision matrices', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Timeline', {employee: admin.id, type: 'Evaluation.DecisionMatrix'}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Timeline', {employee: rh.id, type: 'Evaluation.DecisionMatrix'}))).resolves.toBe(false);
            await expect(roles.can(employee, 'list', RolesService.object('Timeline', {employee: employee.id, type: 'Evaluation.DecisionMatrix'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {employee: manager.id, type: 'Evaluation.DecisionMatrix'}))).resolves.toBe(false);
        });
    });

    describe('Timelines', () => {
        test('can be listed only by "rh"', async () => {
            await expect(roles.can(admin, 'list', RolesService.object('Timeline', {}))).resolves.toBe(false);
            await expect(roles.can(rh, 'list', RolesService.object('Timeline', {}))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', RolesService.object('Timeline', {}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {}))).resolves.toBe(false);
        });

        test('can be listed by "manager" above', async () => {
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {sector: 'root'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {sector: 'right'}))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {sector: 'left'}))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', RolesService.object('Timeline', {sector: 'sub-left'}))).resolves.toBe(true);
        });
    });

    describe('FAQ', () => {
        test('can be listed by anyone', async () => {
            await expect(roles.can(admin, 'list', any('Faq'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', any('Faq'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Faq'))).resolves.toBe(true);
            await expect(roles.can(manager, 'list', any('Faq'))).resolves.toBe(true);
        });
    });

    describe('Managers', () => {
        test('can be listed by rh and admin', async () => {
            await expect(roles.can(admin, 'list', any('Manager'))).resolves.toBe(true);
            await expect(roles.can(rh, 'list', any('Manager'))).resolves.toBe(true);
            await expect(roles.can(employee, 'list', any('Manager'))).resolves.toBe(false);
            await expect(roles.can(manager, 'list', any('Manager'))).resolves.toBe(false);
        });
    });

    describe('Ability', () => {
        test('Can list with conditional permission', async () => {
            const ability = new BarueriAbility(employee, null, null, [{'action': 'list', 'subject': 'Evaluation', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}}]);
            await expect(ability.can('list', 'Evaluation')).resolves.toBe(true);
        });

        test('Cannot list with conditional permission and inverted', async () => {
            const ability = new BarueriAbility(employee, null, null, [{'action': 'list', 'subject': 'Evaluation', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}, 'inverted': true}]);
            await expect(ability.can('list', 'Evaluation')).resolves.toBe(false);
        });
    });

    describe('toMongoQuery', () => {
        test('List Evaluation', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Evaluation', 'list');
            const ourMongo = ability.mongoQuery('Evaluation', 'list');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('List Feedback', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Feedback', 'list');
            const ourMongo = ability.mongoQuery('Feedback', 'list');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('List Coaching Register', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'CoachingRegister', 'list');
            const ourMongo = ability.mongoQuery('CoachingRegister', 'list');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('List Sector', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Sector', 'list');
            const ourMongo = ability.mongoQuery('Sector', 'list');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('Create Sector', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Sector', 'create');
            const ourMongo = ability.mongoQuery('Sector', 'create');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('Detail Sector', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Sector', 'detail');
            const ourMongo = ability.mongoQuery('Sector', 'detail');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('Update Sector', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Sector', 'update');
            const ourMongo = ability.mongoQuery('Sector', 'update');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('Delete Sector', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Sector', 'delete');
            const ourMongo = ability.mongoQuery('Sector', 'delete');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('List Reprimand', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Reprimand', 'list');
            const ourMongo = ability.mongoQuery('Reprimand', 'list');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });

        test('List Suspension', async () => {
            const ability = new BarueriAbility(
                employee,
                null,
                null,
                rules,
            );
            const mongoAbility = createMongoAbility(rules);

            const caslMongo = toMongoQuery(mongoAbility, 'Suspension', 'list');
            const ourMongo = ability.mongoQuery('Suspension', 'list');

            expect(JSON.stringify(caslMongo, null, 2)).toEqual(JSON.stringify(ourMongo, null, 2));
        });
    });
});

const admin = {id: 'admin-id', sector: 'root', roles: 'admin', sectors: {root: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: false}}};
const rh = {id: 'rh-id', sector: 'right', roles: 'rh', sectors: {right: {created_at: new Date().toISOString(), subordinate_to: 'right', is_manager: false}}};
const employee = {id: 'employee-id', sector: 'root', roles: 'employee', sectors: {root: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: false}}};
const employeeRight = {id: 'employee-right-id', sector: 'right', roles: 'employee', sectors: {right: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: false}}};
const employeeLeft = {id: 'employee-left-id', sector: 'left', roles: 'employee', sectors: {left: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: false}}};
const manager = {id: 'manager-id', sector: 'left', roles: 'employee', sectors: {left: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: true}}};
const responsible = {id: 'account-responsible-id', sector: 'root', roles: 'admin', sectors: {root: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: false}}};
const other = {id: 'other-id', sector: 'root', roles: 'employee', sectors: {root: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: false}}};
const andOther = {id: 'and-other-id', sector: 'sub-left', roles: 'employee', sectors: {root: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: false}}};
const rhManager = {id: 'rh-manager-id', sector: 'sub-left', roles: 'rh', sectors: {['sub-left']: {created_at: new Date().toISOString(), subordinate_to: 'left', is_manager: true}}};
const employeeManager = {id: 'employee-manager-id', sector: 'root', roles: 'employee', sectors: {root: {created_at: new Date().toISOString(), subordinate_to: 'root', is_manager: true}}};

function any(type) {
    return RolesService.object(type, {});
}

const sectors = {
    async retrieve(id) {
        return _sectors
            .find(s => s.id === id);
    },
    async list(from = 'root') {
        const sector = await this.retrieve(from);
        return _sectors
            .filter(s => s.path.startsWith(sector.path));
    },
};

const _sectors = [
    {id: 'root', path: 'root'},
    {id: 'left', path: 'root;left', manager: manager.id},
    {id: 'right', path: 'root;right'},
    {id: 'sub-left', path: 'root;left;sub-left', manager: rhManager.id},
];

const _users = [
    admin,
    rh,
    employee,
    employeeRight,
    employeeLeft,
    manager,
    responsible,
    other,
    andOther,
    rhManager,
];

const users = {
    async retrieve(id) {
        return _users.find(u => u.id === id);
    },
};

const account = {
    id: 'account-id',
    responsible: responsible.id,
};

function generateEmployee(isFull, hasWorkingDays, fromSector) {
    const working_days = {
        '0': {
            'start': '08:00',
            'active': true,
            'end': '18:00',
        },
        '1': {
            'start': '08:00',
            'active': true,
            'end': '18:00',
        },
        '2': {
            'start': '08:00',
            'active': true,
            'end': '18:00',
        },
        '3': {
            'start': '08:00',
            'active': true,
            'end': '18:00',
        },
        '4': {
            'start': '08:00',
            'active': true,
            'end': '18:00',
        },
        '5': {
            'start': '08:00',
            'active': true,
            'end': '18:00',
        },
        '6': {
            'start': '08:00',
            'active': true,
            'end': '18:00',
        },
    };

    const basicEmployee = {
        id: 'id',
        sector: fromSector || 'sector',
        name: 'name',
        rank: 'rank',
        disabled: false,
        email: 'email@mail.com',
        mobile_phone: '8598877665',
    };

    const fullEmployee = {
        ...basicEmployee,
        'hired_at': 'date',
        'effectivated_at': 'date',
        'effective': true,
        'dismissed_at': 'date',
        'register': '123456',
        'monthly_hours': null,
        working_days,
    };

    return isFull ? fullEmployee : hasWorkingDays ? {...basicEmployee, working_days} : basicEmployee;
}

const rules = [
    {
        'action': 'detail',
        'subject': 'User',
        'conditions': {
            'id': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': 'update',
        'subject': 'User',
        'conditions': {
            'id': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
        'fields': [
            'password',
        ],
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'History',
    },
    {
        'action': 'manage',
        'subject': 'Sector',
    },
    {
        'action': [
            'list',
            'detail',
            'update',
        ],
        'subject': 'Employee',
    },
    {
        'action': 'detail',
        'subject': 'Rank',
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Feedback',
    },
    {
        'action': 'detail',
        'subject': 'Feedback',
        'conditions': {
            'employee': {
                '$exists': false,
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Feedback',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Feedback',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'status': {
                '$exists': true,
                '$ne': 'approved',
            },
        },
        'inverted': true,
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Feedback',
        'conditions': {
            'created_by': {
                '$in': [
                    'rh',
                ],
            },
        },
    },
    {
        'action': 'update',
        'subject': 'Feedback',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
        'fields': [
            'read',
        ],
    },
    {
        'action': 'create',
        'subject': 'Feedback',
        'conditions': {
            'employee': {
                '$nin': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'CoachingRegister',
    },
    {
        'action': 'update',
        'subject': 'CoachingRegister',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
        'fields': [
            'read',
        ],
    },
    {
        'action': 'update',
        'subject': 'CoachingRegisterTodo',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
        'fields': [
            'completed_at',
        ],
    },
    {
        'action': 'manage',
        'subject': 'Rank',
    },
    {
        'action': 'manage',
        'subject': 'Evaluation',
        'conditions': {
            'employee': {
                '$exists': false,
            },
        },
    },
    {
        'action': 'manage',
        'subject': 'Evaluation',
        'conditions': {
            'employee': {
                '$exists': true,
                '$nin': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Evaluation',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$ne': 'decision-matrix',
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Evaluation',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$eq': 'decision-matrix',
            },
            'disclosed_to_employee': {
                '$eq': true,
            },
        },
    },
    {
        'action': 'update',
        'subject': 'Evaluation',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
        'fields': [
            'read',
            'status',
        ],
    },
    {
        'action': [
            'detail',
            'update',
        ],
        'subject': 'Evaluation',
        'conditions': {
            'responsible': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$eq': 'Evaluation.Multidirectional',
            },
        },
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$eq': 'Evaluation.DecisionMatrix',
            },
        },
        'inverted': true,
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$eq': 'Evaluation.DecisionMatrixDisclosedToEmployee',
            },
        },
    },
    {
        'action': [
            'list',
            'create',
        ],
        'subject': 'ClimateCheck',
    },
    {
        'action': [
            'detail',
        ],
        'subject': 'ClimateCheck',
        'fields': [
            'history',
        ],
    },
    {
        'action': 'manage',
        'subject': 'ClimateCheck',
        'conditions': {
            'employee': {
                '$exists': true,
                '$nin': [
                    'me',
                    'rh',
                ],
            },
        },
        'inverted': true,
    },
    {
        'action': 'list',
        'subject': 'PendingAction',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': 'list',
        'subject': 'Timeline',
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$eq': 'Evaluation.Multidirectional',
            },
        },
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$eq': 'Evaluation.DecisionMatrix',
            },
        },
        'inverted': true,
    },
    {
        'action': 'list',
        'subject': 'Timeline',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'type': {
                '$eq': 'Evaluation.DecisionMatrixDisclosedToEmployee',
            },
        },
    },
    {
        'action': 'manage',
        'subject': 'Reprimand',
    },
    {
        'action': [
            'create',
            'update',
            'delete',
        ],
        'subject': 'Reprimand',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
        'inverted': true,
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Reprimand',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Reprimand',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'status': {
                '$exists': true,
                '$ne': 'SENT',
            },
        },
        'inverted': true,
    },
    {
        'action': 'manage',
        'subject': 'Suspension',
        'conditions': {
            'employee': {
                '$nin': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Suspension',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Suspension',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
            'status': {
                '$exists': true,
                '$ne': 'SENT',
            },
        },
        'inverted': true,
    },
    {
        'action': 'manage',
        'subject': 'EvaluationsScheduler',
    },
    {
        'action': 'manage',
        'subject': 'Vacation',
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Training',
        'conditions': {
            'disabled': {
                '$ne': true,
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'TrainingTrail',
        'conditions': {
            'employee': {
                '$exists': true,
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'TrainingProgress',
    },
    {
        'action': [
            'list',
            'detail',
            'create',
        ],
        'subject': 'TrainingProgress',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': 'manage',
        'subject': 'Template',
    },
    {
        'action': 'detail',
        'subject': 'Content',
    },
    {
        'action': 'manage',
        'subject': 'DismissInterview',
    },
    {
        'action': 'list',
        'subject': 'Manager',
    },
    {
        'action': 'create',
        'subject': 'Note',
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Tutorial',
    },
    {
        'action': 'list',
        'subject': 'Faq',
    },
    {
        'action': 'manage',
        'subject': 'Onboarding',
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'UnseenItem',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Topic',
    },
    {
        'action': 'update',
        'subject': 'Topic',
        'conditions': {
            'employee': {
                '$in': [
                    'me',
                    'rh',
                ],
            },
        },
        'fields': [
            'progress',
        ],
    },
    {
        'action': 'detail',
        'subject': 'AsyncTask',
    },
    {
        'action': 'manage',
        'subject': 'Absence',
    },
    {
        'action': [
            'list',
            'detail',
        ],
        'subject': 'Configuration',
    },
];
