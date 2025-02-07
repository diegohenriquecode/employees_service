import Joi from '../../utils/joi';

export enum AbsenceType {
    MATERNITY_LEAVE = 'maternity_leave',
    PATERNITY_LEAVE = 'paternity_leave',
    MEDICAL = 'medical',
    MARRIAGE = 'marriage',
    FAMILY_LOSS = 'family_loss',
    BLOOD_DONATION = 'blood_donation',
    VOTE_REGISTRATION = 'vote_registration',
    MILITARY_SERVICE = 'military_service',
    ENTRANCE_EXAM = 'entrance_exam',
    COURT_APPEARANCE = 'court_appearance',
    VACATION = 'vacation'
}

export const VacationWithoutTypeSchema = {
    id: Joi.string(),

    start: Joi.date().iso().raw(),
    end: Joi.date().iso().min(Joi.ref('start')).raw(),

    employee: Joi.string(),
    sector: Joi.string(),
    account: Joi.string(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
};

export type Vacation = WithDefaultProps<VacationProps>;
export type VacationProps = {
    type: AbsenceType
    start: string
    end: string
    sold: boolean

    employee: string
    sector: string
    account: string
};
export type CreateVacationProps = Pick<Vacation, 'start' | 'end' | 'sold' | 'type'>;
export type UpdateVacationProps = Partial<CreateVacationProps>;
export type CreateAbsenceProps = Pick<Vacation, 'start' | 'end' | 'sold'| 'type' | 'employee'>;
export type UpdateAbsenceProps = Partial<CreateAbsenceProps>;
