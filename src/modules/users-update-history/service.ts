import {BarueriConfig} from 'config';
import {Account} from 'modules/accounts/schema';
import {User} from 'modules/users/schema';

import UsersUpdateHistoryRepository from './repository';
import {UsersUpdateHistoryListProps, UserUpdateHistoryItem} from './schema';

export default class UsersUpdateHistoryService {

    static config(cfg: BarueriConfig, user: User, account: Account): UsersUpdateHistoryService {
        return new UsersUpdateHistoryService(
            UsersUpdateHistoryRepository.config(cfg, user.id, account.id),
        );
    }

    async list(user: string, props: UsersUpdateHistoryListProps) {
        const result = await this.repository.list(user, props);
        return {
            ...result,
            items: result.items
                .map(ServiceMapper.public)
                .filter(item => item.changes.length),
        };
    }

    constructor(
        private repository: UsersUpdateHistoryRepository,
    ) {}
}

class ServiceMapper {
    static public(item: UserUpdateHistoryItem) {
        return {
            ...item,
            before: {
                ...item.before,
                password: HIDDEN_PASSWORD,
            },
            changes: item.changes
                .filter(operation => !PRIVATE_CHANGES.includes(operation.path))
                .map(change => change.path === '/password' && OPERATIONS_WITH_VALUE.includes(change.op) ? {...change, value: HIDDEN_PASSWORD} : change),
        } as UserUpdateHistoryItem;
    }
}

const HIDDEN_PASSWORD = '********';
const OPERATIONS_WITH_VALUE = ['add', 'replace', 'test', '_get'];
const PRIVATE_CHANGES = ['/id', '/avatar_key', '/scopes', '/client_id', '/account', '/created_at', '/created_by', '/updated_at', '/updated_by', '/subordinate_to'];
