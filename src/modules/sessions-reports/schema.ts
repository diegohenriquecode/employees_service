export type SessionsReportsProps = {
    id: string
    date: string
    employee: string
    account: string
};

export type SessionsReports = SessionsReportsProps & {
    created_at: string
    updated_at: string
};

export enum SessionsReportsGroup {
    BY_DAY = 'day',
    BY_MONTH = 'month',
}

export type ListSessionsReportsProps = {
    from: Date,
    to: Date,
    groupBy: SessionsReportsGroup,
};
