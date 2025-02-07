import Joi from 'joi';
import {WorkingDay, WorkingDaySchema} from 'modules/employees/schema';

enum OpeningReason {
    STAFF_INCREASE = 'staffIncrease',
    REPLACEMENT = 'replacement'
}

enum ReplacementReason {
    RESIGNATION_REQUEST = 'resignationRequest',
    DISMISSAL = 'dismissal',
    MATERNITY_LEAVE = 'maternityLeave',
    MEDICAL_LEAVE = 'medicalLeave'
}

export enum VacancyStatus {
    DRAFT = 'draft',
    OPEN = 'open'
}

const JobVacancySchema = Joi.object({
    title: Joi.string().required(),
    rank: Joi.string().required(),
    sector: Joi.string().required(),
    responsibleManager: Joi.string().allow(null).optional(),
    requestDate: Joi.date().optional(),
    openingReason: Joi.string().valid(...Object.values(OpeningReason)).required(),
    justification: Joi.when('openingReason', {
        is: 'staffIncrease',
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
    }),
    replacementReason: Joi.when('openingReason', {
        is: 'replacement',
        then: Joi.string().valid(...Object.values(ReplacementReason)).required(),
        otherwise: Joi.forbidden(),
    }),
    workSchedule: Joi.object(
        [0, 1, 2, 3, 4, 5, 6].reduce((o, key) => ({...o, [key]: WorkingDaySchema}), {})),
    minSalary: Joi.number().required(),
    maxSalary: Joi.number().required(),
    description: Joi.string().required(),
    responsibilities: Joi.string().required(),
    requirements: Joi.string().required(),
    desirable: Joi.string().allow(null).optional(),
    enabled: Joi.boolean().default(true),
    status: Joi.string().valid(...Object.values(VacancyStatus)).required(),
});

const JobVacancyUpdateSchema = Joi.object({
    title: Joi.string().optional(),
    rank: Joi.string().optional(),
    sector: Joi.string().optional(),
    responsibleManager: Joi.string().allow(null).optional(),
    requestDate: Joi.date().optional(),
    openingReason: Joi.string().valid(...Object.values(OpeningReason)).required(),
    justification: Joi.when('openingReason', {
        is: 'staffIncrease',
        then: Joi.string().optional(),
        otherwise: Joi.forbidden(),
    }),
    replacementReason: Joi.when('openingReason', {
        is: 'replacement',
        then: Joi.string().valid(...Object.values(ReplacementReason)).optional(),
        otherwise: Joi.forbidden(),
    }),
    workSchedule: Joi.object(
        [0, 1, 2, 3, 4, 5, 6].reduce((o, key) => ({...o, [key]: WorkingDaySchema}), {})),
    minSalary: Joi.number().optional(),
    maxSalary: Joi.number().optional(),
    description: Joi.string().optional(),
    responsibilities: Joi.string().optional(),
    requirements: Joi.string().optional(),
    desirable: Joi.string().allow(null).optional(),
    enabled: Joi.boolean().optional(),
    status: Joi.string().valid(...Object.values(VacancyStatus)).required(),
});

export {JobVacancySchema, JobVacancyUpdateSchema};

export type JobVacancyProps = {
    title: string;
    rank: string;
    sector: string;
    responsibleManager?: string;
    requestDate?: Date;
    openingReason: OpeningReason;
    justification?: string;
    replacementReason?: ReplacementReason;
    workSchedule?:{
        0: WorkingDay,
        1: WorkingDay,
        2: WorkingDay,
        3: WorkingDay,
        4: WorkingDay,
        5: WorkingDay,
        6: WorkingDay,
      }
    minSalary: number;
    maxSalary: number;
    description: string;
    responsibilities: string;
    requirements: string;
    desirable?: string;
    enabled: boolean;
    creationDate: Date;
    lastModificationDate: Date;
    status: VacancyStatus
};

export type JobVacancy = JobVacancyProps & {
    accountId: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type JobVacancyEdit = Partial<Omit<JobVacancy, 'creationDate' | 'lastModificationDate'>>;
