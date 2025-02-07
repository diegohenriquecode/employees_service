import Joi from 'joi';
import {AbsenceType, CreateAbsenceProps, UpdateAbsenceProps, Vacation, VacationWithoutTypeSchema} from 'modules/vacations/schema';
import {extract} from 'utils/joi';

export const VacationSchema = Joi.object<Vacation>({
    ...VacationWithoutTypeSchema,
    sold: Joi.boolean().optional().default(false),
    type: Joi.string().valid(...Object.values(AbsenceType)),
});

export const CreateAbsenceSchema = extract<Vacation, CreateAbsenceProps>(VacationSchema, ['start', 'end', 'sold', 'type']);
export const UpdateAbsenceSchema = extract<Vacation, UpdateAbsenceProps>(VacationSchema, ['start', 'end', 'sold', 'type'], ['start', 'end', 'sold', 'type']);

export type FindQueryArgs = {
    type?: AbsenceType
    employeeId: string
};

export const QueryAbsencesSchema = Joi.object<FindQueryArgs>().keys({
    type: Joi.string().valid(...Object.values(AbsenceType)).optional(),
}).unknown(true);
