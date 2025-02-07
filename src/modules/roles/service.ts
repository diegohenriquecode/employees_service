import {AnyMongoAbility, ForcedSubject, subject as castedObject} from '@casl/ability';
import {guard} from '@ucast/mongo2js';
import {orderBy} from 'lodash';
import get from 'lodash/get';
import pick from 'lodash/pick';
import template from 'lodash/template';
import uniq from 'lodash/uniq';
import {ClausesType} from 'modules/feedbacks/schema';

import {BarueriConfig} from '../../config';
import {Account} from '../accounts/schema';
import {BadRequestError, ConflictError, ForbiddenError, NotFoundError} from '../errors/errors';
import OrgChartsService from '../orgchart/service';
import UsersRepository from '../users/repository';
import {AppUser, User} from '../users/schema';
import {RNs, adminRNs} from './business-rules';
import RolesRepository from './repository';
import {basicPermissions, convertPermission, permissionsByRole} from './rolesConverter';
import {Role} from './schema';

export type PermissionAction = typeof actions[number];
export type PermissionObjectType = typeof subjects[number];
export type PermissionObject = ForcedSubject<Exclude<typeof subjects[number], 'all'>> & object;

const actions = ['manage', 'create', 'list', 'detail', 'update', 'delete'] as const;
export const subjects = [
    'User',
    'Sector',
    'Employee',
    'Feedback',
    'CoachingRegister',
    'Rank',
    'Evaluation',
    'ClimateCheck',
    'PendingAction',
    'Timeline',
    'Vacation',
    'Reprimand',
    'Suspension',
    'Template',
    'Tutorial',
    'Training',
    'TrainingProgress',
    'Note',
    'Faq',
    'Onboarding',
    'Content',
    'all',
    'TrainingTrail',
    'ExportReport',
    'DismissInterview',
    'Configuration',
    'JobVacancy',
    'NewsFeed',
    'NewsFeedComment',
    'Role',
] as const;

export default class RolesService {

    static config(cfg: BarueriConfig, user: AppUser, account: Account): RolesService {
        return new RolesService(
            RolesRepository.config(cfg, user.id, account.id),
            UsersRepository.config(cfg, user.id, account.id),
            OrgChartsService.config(cfg, user, account.id),
            account,
        );
    }

    static object(type: typeof subjects[number], obj: object): PermissionObject {
        return castedObject(type, {...obj}) as PermissionObject;
    }

    async create(props: Role) {
        const roles = await this.list(false);

        if (roles.some(role => role.name === props.name)) {
            throw new ConflictError('Already exists a role with this name');
        }

        return await this.repository.create({
            ...props,
            private: props.private ?? false,
        });
    }

    async list(onlyEnabled: boolean) {
        const list = await this.repository.list(false, onlyEnabled);
        return orderBy(list, ['created_at']);
    }

    async update(data: Role, props: Partial<Role>) {

        const uneditablePermissions = permissionsByRole[data.id as keyof typeof permissionsByRole];

        if (uneditablePermissions) {
            if (props.permissions?.some(p => uneditablePermissions.includes(p))) {
                throw new BadRequestError('Some permission cannot be edited');
            }
        }

        const rolesAssociatedToAUser = await this.users.getUserWitRole(data.id);
        if (rolesAssociatedToAUser.length > 0 && props.enabled !== null && props.enabled !== undefined) {
            throw new BadRequestError('Some user is associated with this role.');
        }

        const updated = await this.repository.update(data, props);

        return updated;
    }

    async retrieve(id: string) {
        const role = await this.repository.retrieve(id);
        if (!role) {
            throw new NotFoundError('Role not found');
        }

        return role;
    }

    async rules(user: User) {
        const role = await this.retrieve(user.roles);
        let permissions = role.permissions
            .map(convertPermission);

        if (user.roles === 'admin') {
            permissions = [...adminRNs, ...permissions];
        } else {
            permissions = [...RNs, ...basicPermissions.map(convertPermission), ...permissions];
        }

        const roleId = role.id as keyof typeof permissionsByRole;
        if (permissionsByRole[roleId]) {
            permissions = [...permissions, ...permissionsByRole[roleId].map(convertPermission)];
        }

        const managerOf = Object.keys(user.sectors).filter(sector => user.sectors[sector].is_manager);

        if (managerOf.length > 0) {
            const managerRole = await this.retrieve('manager');
            permissions = [
                ...permissions,
                ...managerRole.permissions.map(convertPermission),
                ...permissionsByRole['manager'].map(convertPermission),
            ];
            const descendants = (await Promise.all(managerOf.map(s => this.sectors.list(s)))).flat();
            user = {
                ...user,
                sector: {
                    descendants: uniq(descendants.map(d => d.id)),
                },
            };
        } else {
            const descendants = await this.sectors.list(user.sector);
            user = {
                ...user,
                sector: {
                    descendants: uniq(descendants.map(d => d.id)),
                },
            };
        }

        return interpolate(JSON.stringify(permissions), {user, account: this.account});
    }

    userAbility(user: User, rules: any[]) {
        return new BarueriAbility(
            user,
            this.users,
            this.sectors,
            rules,
        );
    }

    constructor(
        private repository: RolesRepository,
        private users: UsersRepository,
        private sectors: OrgChartsService,
        private account: Account,
    ) {}
}

export class BarueriAbility {

    filterPermissions(action: PermissionAction, resource: PermissionObjectType | PermissionObject, field?: string) {
        const actionPermissions = this.rules
            .filter(rule => rule?.action === action || rule?.action.includes(action) || rule?.action === 'manage')
            .filter(rule => {
                if (field) {
                    return rule?.fields?.length ? rule?.fields.includes(field) : true;
                } else {
                    return !(rule?.fields?.length && rule?.inverted);
                }
            })
            .filter(rule => {
                if (typeof resource === 'string') {
                    return resource === rule.subject;
                } else {
                    if (resource.__caslSubjectType__ !== rule.subject) {
                        return false;
                    }
                    return true;
                }
            })
            .filter(rule => {
                if (!rule.conditions || typeof resource === 'string') {
                    return true;
                }

                const testFunc = guard(rule.conditions as Record<string, unknown>);
                return testFunc(resource as Record<string, unknown>);
            });

        return actionPermissions;
    }

    async enrichedPermissions(action: PermissionAction, resource: PermissionObjectType | PermissionObject, field?: string) {
        const enrichedResource = await this.enrichedResource(resource);
        return this.filterPermissions(action, enrichedResource, field);
    }

    async can(action: PermissionAction, resource: PermissionObjectType | PermissionObject, field?: string) {
        try {

            const filteredPermissions = await this.enrichedPermissions(action, resource, field);

            /**
             * TODO: Tratar situação onde existe invertido sem condição
             */
            if (typeof resource === 'string' && filteredPermissions.some(fp => !fp.inverted)) {
                return true;
            }

            return filteredPermissions.length > 0 && !filteredPermissions.some(p => p.inverted);
        } catch (e) {
            if (e instanceof NotFoundError) {
                console.warn(e);
                throw new ForbiddenError();
            }
            console.error(e);
            throw e;
        }
    }

    async cannot(action: PermissionAction, resource: PermissionObjectType | PermissionObject, field?: string) {
        return !this.can(action, resource, field);
    }

    onlyAllowedFields(resource: PermissionObjectType, action: PermissionAction = 'detail') {
        return (data: object) => {
            const options = {fieldsFrom: r => r.fields || Object.keys(data)};
            const fields = this.permittedFieldsOf(action, resource, options);
            return pick(data, fields);
        };
    }

    mongoQuery(
        resource: PermissionObjectType | PermissionObject,
        action: PermissionAction,
    ): ClausesType {
        const query: any = {};

        const rules = this.filterPermissions(action, resource).reverse();

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const op = rule.inverted ? '$and' : '$or';

            if (!rule.conditions) {
                if (rule.inverted) {
                    break;
                } else {
                    delete query[op];
                    return query;
                }
            } else {
                query[op] = query[op] || [];
                query[op]!.push(this.convertToMongoQuery(rule));
            }
        }

        return query.$or ? query : null;
    }

    private convertToMongoQuery(rule: AnyMongoAbility['rules'][number]) {
        const conditions = rule.conditions!;
        return rule.inverted ? {$nor: [conditions]} : conditions;
    }

    private permittedFieldsOf(
        action: PermissionAction,
        subject: PermissionObjectType,
        options: any,
    ): string[] {
        const rules = this.filterPermissions(action, subject);
        const uniqueFields = new Set<string>();
        const deleteItem = uniqueFields.delete.bind(uniqueFields);
        const addItem = uniqueFields.add.bind(uniqueFields);
        let i = rules.length;

        while (i--) {
            const rule = rules[i];
            const toggle = rule.inverted ? deleteItem : addItem;
            options.fieldsFrom(rule).forEach(toggle);
        }

        return Array.from(uniqueFields);
    }

    private async enrichedResource(resource: PermissionObjectType | PermissionObject) {
        if (resource.sector) {
            const sector = await this.sectors.retrieve(resource.sector, true);
            if (!sector) {
                throw new NotFoundError('sector not found');
            }
            resource._SectorPath = sector.path;
        }
        if (resource.employee && typeof resource.employee === 'string') {
            const employee = await this.users.retrieve(resource.employee === 'me' ? this.user.id : resource.employee);
            if (!employee) {
                throw new NotFoundError('employee not found');
            }
            resource.sector = employee.sector;
        }
        return resource;
    }

    constructor(
        private user: User,
        private users: UsersRepository,
        private sectors: OrgChartsService,
        private rules: any[],
    ) {}
}

function interpolate(permissions: string, vars: object) {
    return JSON.parse(permissions, (_, rawValue) => {
        if (!rawValue?.includes?.('${')) {
            return rawValue;
        }

        const value = (rawValue.startsWith('${') && rawValue.endsWith('}'))
            ? get(vars, rawValue.slice(2, -1))
            : template(rawValue)(vars);

        if (typeof value === 'undefined') {
            throw new ReferenceError(`Value ${rawValue} cannot be resolved`);
        }

        return value;
    });
}
