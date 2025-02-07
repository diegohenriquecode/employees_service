import {NoteSchema} from '../../../modules/notes/schema';

export const CreateNoteSchema = NoteSchema
    .fork(['id', 'user', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());
