import {Operation} from 'fast-json-patch';
import {User} from 'modules/users/schema';

export type UserUpdateHistoryItem = {
    before: User | null
    changed_at: string
    changed_by: string
    changes: Operation[]

    account: string
    user: string

    created_at: string
    created_by: string
};

export type UsersUpdateHistoryListProps = {
    from: Date,
    pageSize: number,
    next?: string,
    to: Date,
};
