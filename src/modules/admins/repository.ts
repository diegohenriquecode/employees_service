import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuid} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {Admin, AdminProps, permissionResources, PermissionTypes} from './schema';

export default class AdminsRepository {
    static config(cfg: BarueriConfig, userId: string) {
        return new AdminsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.adminsTable,
            cfg.adminsByEmail,
            userId,
        );
    }

    async list() {
        const {Items} = await this.documents.scanAll({
            TableName: this.table,
        });
        return (Items as Admin[]).map(mapper.from);
    }

    async create(props: AdminProps) {
        const Item: Admin = {
            id: uuid(),
            ...props,
            created_at: moment().toISOString(),
            created_by: this.userId,
            updated_at: moment().toISOString(),
            updated_by: this.userId,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
            ConditionExpression: 'attribute_not_exists(id)',
        });
        return mapper.from(Item);
    }

    async findByEmail(email: string) {
        const {Items: [Item]} = await this.documents.queryAll({
            TableName: this.table,
            IndexName: this.byEmailIndex,
            KeyConditionExpression: '#email = :email',
            ExpressionAttributeNames: {'#email': 'email'},
            ExpressionAttributeValues: {':email': email},
        });
        return mapper.from(Item as Admin);
    }

    async retrieve(adminId: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {id: adminId},
        });
        return mapper.from(Item as Admin);
    }

    async patch(id: string, fieldName: string, fieldValue: string) {
        await this.documents.update({
            TableName: this.table,
            Key: {id},
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.userId},
        });
    }

    async update(current: Admin, patch: Partial<Admin>) {
        await this.checkUniques(current.id, patch);

        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.userId,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return mapper.from(Item);
    }

    private async checkEmail(id: string, email: string) {
        const emailUser = await this.findByEmail(email);
        if (emailUser && emailUser.id !== id) {
            throw new ConflictError('email already registered');
        }
    }

    private async checkUniques(id: string, data: Partial<Admin>) {
        data.email && await this.checkEmail(id, data.email);
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byEmailIndex: string,
        private userId: string,
    ) { }
}

const mapper = {
    from: (user: Admin) => {
        if (!user) {
            return user;
        }

        return {
            ...user,
            permissions: user.permissions || {...AllPermissions},
            disabled: user.disabled ?? false,
        };
    },
};

const AllPermissions = Object.values(permissionResources)
    .map(key => ({[key]: PermissionTypes.manage}))
    .reduce((obj, field) => Object.assign(obj, field), {});
