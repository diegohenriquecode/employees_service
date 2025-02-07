export type TokenProps = {
    client_id: string
    type: string
    revoked: boolean
    expires_in: number
    user_id: string
    account_id?: string
    scope?: string
    user_roles?: unknown
};

export type Token = TokenProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};
