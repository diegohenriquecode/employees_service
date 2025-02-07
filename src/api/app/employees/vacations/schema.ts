import {AbsenceType, CreateVacationProps, UpdateVacationProps, Vacation, VacationWithoutTypeSchema} from 'modules/vacations/schema';
import Joi, {extract} from 'utils/joi';

export const VacationSchema = Joi.object<Vacation>({
    ...VacationWithoutTypeSchema,
    sold: Joi.boolean(),
    type: Joi.string().valid(AbsenceType.VACATION).optional().default(AbsenceType.VACATION),
});

export const CreateVacationSchema = extract<Vacation, CreateVacationProps>(VacationSchema, ['start', 'end', 'sold']);
export const UpdateVacationSchema = extract<Vacation, UpdateVacationProps>(VacationSchema, ['start', 'end', 'sold'], ['start', 'end', 'sold']);
