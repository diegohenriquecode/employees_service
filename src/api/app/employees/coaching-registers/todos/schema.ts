import {CoachingRegisterTodoSchema} from 'modules/coaching-registers/schema';

export const CreateCoachingRegisterTodoSchema = CoachingRegisterTodoSchema;

export const UpdateCoachingRegisterTodoSchema = CreateCoachingRegisterTodoSchema
    .fork(
        [
            'what',
            'why',
            'who',
            'where',
            'when',
            'how',
            'how_much',
        ],
        schema => schema.optional(),
    );

export const CompleteCoachingRegisterTodoSchema = CoachingRegisterTodoSchema.extract('completed_at').required();
