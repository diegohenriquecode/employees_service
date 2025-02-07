import {CoachingRegisterSchema} from 'modules/coaching-registers/schema';

import Joi from '../../../../utils/joi';

export const CreateCoachingRegisterSchema = CoachingRegisterSchema.fork(['id', 'read', 'read_at', 'employee', 'rank', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const SetReadSchema = Joi.boolean().invalid(false);

export const UpdateCoachingRegisterSchema = CreateCoachingRegisterSchema
    .fork(['todos'], schema => schema.forbidden())
    .fork(['current_state', 'intended_state'], schema => schema.optional());
