export type TimelineProps = {
  id: string
  type: string
  date: string
  employee: string
  account: string
  data: object
};

export type Timeline = TimelineProps & {
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
};

export type ListTimelineProps = {
    pageSize?: number,
    from: Date,
    to: Date,
    type?: TimelineProps['type'],
    next?: string,
};

export type FilterQueryType = {
  expression: string;
  names: { [key: string]: string };
  values: { [key: string]: string };
};
