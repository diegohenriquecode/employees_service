export enum ChangesHistoryType {
    'INSERT',
    'MODIFY',
    'REMOVE'
}

export type ChangesHistoryProps = {
    id: string
    account: string
    user: string
    oldData: Record<string, any>,
    newData: Record<string, any>,
    diffData: Record<string, any>,
    changeType: ChangesHistoryType,
    entity: string,
    entity_id: string,
    change_date: string,
};

export type ChangesHistory = ChangesHistoryProps & {
    created_at: string
    created_by: string
};

export type ListProps = {
    from: Date;
    to: Date;
    entity: string;
    entity_id: string;
};
