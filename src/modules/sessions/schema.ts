export enum SessionType {
    VALIDATE_CODE = 'validate-code',
    SET_PASSWORD = 'set-password',
    // fake ones:
    EMAIL_SENT = 'email-sent',
    SUCCESS = 'success',
}

export type SessionProps = {
    code: string
    expiresAt: string
    type: SessionType
    user_id: string
    username: string
    used: boolean
};

export type Session = SessionProps & {
    id: string
    created_at: string
    created_by: string
    updated_at?: string | null
    updated_by?: string | null
};
