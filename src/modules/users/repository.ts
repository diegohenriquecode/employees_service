import {MongoQuery} from '@ucast/mongo';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import {updateExpression} from '../../utils/convert-to-dynamo-expression';
import DynamoClient from '../../utils/dynamo-client';
import UsersMysqlRepository, {UsersMysqlQueryOptions} from './repository.mysql';
import {User, UserProps} from './schema';

export default class UsersRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new UsersRepository(
            UsersMysqlRepository.config(cfg),
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.usersTable,
            cfg.usersByEmail,
            cfg.usersByMobilePhone,
            cfg.usersByUsername,
            user,
            account,
        );
    }

    async getUserWitRole(roleId: string) {
        const query = {
            $and: [
                {account: {$eq: this.account}},
                {roles: {$eq: roleId}},
            ],
        };

        return await this.mysql.list(query);
    }

    async create(user: UserProps) {
        await this.checkUniques('', user);

        const Item: User = mapper.to({
            id: uuidV4(),
            ...user,
            account: this.account,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        });

        await this.mysql.create(mapper.from(Item) as User);

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return mapper.from(Item);
    }

    async update(current: User, patch: Partial<UserProps>) {
        await this.checkUniques(current.id, patch);

        const Item: User = mapper.to({
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        });

        await this.mysql.update(current, mapper.from(Item) as User);

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return mapper.from(Item);
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {account: this.account, id},
        });
        return mapper.from(Item as User | undefined);
    }

    async findByEmail(email: string) {
        const {Items = []} = await this.documents.query({
            ExpressionAttributeNames: {
                '#account': 'account',
                '#email': 'email',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':email': email,
            },
            IndexName: this.byEmail,
            KeyConditionExpression: '#account = :account and #email = :email',
            TableName: this.table,
        });
        return mapper.from(Items[0] as User | undefined);
    }

    async findByPhone(phone: string) {
        const {Items = []} = await this.documents.query({
            ExpressionAttributeNames: {
                '#account': 'account',
                '#mobile_phone': 'mobile_phone',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':mobile_phone': phone,
            },
            IndexName: this.byMobilePhone,
            KeyConditionExpression: '#account = :account and #mobile_phone = :mobile_phone',
            TableName: this.table,
        });
        return mapper.from(Items[0] as User | undefined);
    }

    async findByUsername(username: string) {
        const {Items = []} = await this.documents.query({
            ExpressionAttributeNames: {
                '#account': 'account',
                '#username': 'username',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':username': username,
            },
            IndexName: this.byUsername,
            KeyConditionExpression: '#account = :account and #username = :username',
            TableName: this.table,
        });
        return mapper.from(Items[0] as User | undefined);
    }

    async patch(id: string, fieldName: string, fieldValue: unknown) {
        await this.checkUniques(id, {[fieldName]: fieldValue});

        await this.documents.update({
            TableName: this.table,
            Key: {account: this.account, id},
            ...updateExpression({
                set: {
                    [fieldName]: fieldValue,
                    updated_at: moment().toISOString(),
                    updated_by: this.user,
                },
            }),
        });
    }

    async delete(id: string, fieldName: string) {
        await this.documents.update({
            TableName: this.table,
            Key: {account: this.account, id},
            ...updateExpression({
                remove: {
                    [fieldName]: undefined,
                },
                set: {
                    updated_at: moment().toISOString(),
                    updated_by: this.user,
                },
            }),
        });
    }

    async handleNewVersion(type: 'INSERT' | 'MODIFY' | 'REMOVE', OldItem: User, NewItem: User) {

        const oldItem = mapper.from(OldItem) as User;
        const newItem = mapper.from(NewItem) as User;

        try {
            if (type === 'INSERT') {
                await this.mysql.create(newItem);
            }
            if (type === 'MODIFY') {
                await this.mysql.update(oldItem, newItem);
            }
        } catch (error) {
            if (error instanceof ConflictError) {
                console.warn('ignoring conflict error');
            } else {
                throw error;
            }
        }
        if (type === 'REMOVE') {
            await this.mysql.remove(oldItem.id, this.account);
        }
    }

    async list(mangoQuery: MongoQuery, options: UsersMysqlQueryOptions = {}, relationsQuery?: MongoQuery) {
        return this.mysql.list(mangoQuery, options, relationsQuery);
    }

    async listManagers(usersClause: MongoQuery, relationsQuery: MongoQuery) {
        return this.mysql.list(usersClause, {}, relationsQuery);
    }

    async count(mangoQuery: Record<string, unknown>, relationsQuery?: MongoQuery) {
        return this.mysql.count(mangoQuery, relationsQuery);
    }

    async countDisabled(mangoQuery: Record<string, unknown>) {
        return this.mysql.countDisabled(mangoQuery);
    }

    private async checkEmail(id: string, email: string) {
        const emailUser = await this.findByEmail(email);
        if (emailUser && emailUser.id !== id) {
            throw new ConflictError('email already registered');
        }
    }

    private async checkPhone(id: string, phone: string) {
        const phoneUser = await this.findByPhone(phone);
        if (phoneUser && phoneUser.id !== id) {
            throw new ConflictError('phone already registered');
        }
    }

    private async checkUsername(id: string, username: string) {
        const usernameUser = await this.findByUsername(username);
        if (usernameUser && usernameUser.id !== id) {
            throw new ConflictError('username already registered');
        }
    }

    async checkUniques(id: string, data: Partial<Pick<User, 'email' | 'mobile_phone' | 'username'>>) {
        data.email && await this.checkEmail(id, data.email);
        data.mobile_phone && await this.checkPhone(id, data.mobile_phone);
        data.username && await this.checkUsername(id, data.username);
    }

    constructor(
        private mysql: UsersMysqlRepository,
        private documents: DynamoClient,
        private table: string,
        private byEmail: string,
        private byMobilePhone: string,
        private byUsername: string,
        private user: string,
        private account: string,
    ) {

    }

}

const mapper = {
    to: (item: User) => {
        return {
            ...item,
            email: item.email || 'null',
            mobile_phone: item.mobile_phone || 'null',
        };
    },
    from: (item?: User) => {
        if (!item) {
            return item;
        }

        const cloned = {...item};
        const nullableKeys = ['email', 'mobile_phone'];
        for (const key of nullableKeys) {
            if (item[key as keyof User] === 'null') {
                delete cloned[key as keyof User];
            }
        }

        const change_password = item.change_password === undefined ? true : item.change_password;
        return {...cloned, change_password};
    },
};
