import {EvaluationsSchedulerSchema} from 'modules/evaluations-scheduler/schema';
import {extract} from 'utils/joi';

export const CreateEmployeeEvaluationsScheduleSchema = extract(
    EvaluationsSchedulerSchema,
    ['type', 'rule'],
);

export const UpdateEmployeeEvaluationsScheduleSchema = extract(
    EvaluationsSchedulerSchema,
    ['status', 'rule'],
);

export type EmployeeEvaluationSchedulerParams = {
    employeeId: string,
};
