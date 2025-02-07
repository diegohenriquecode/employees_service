
export type UnseenItemProps = {
    id: string,
    employee: string,
    account: string,
    count: number,
};

export type UnseenItem = UnseenItemProps & {
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};
