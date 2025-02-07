import {RankSchema} from 'modules/ranks/schema';

export const CreateRankSchema = RankSchema.fork(['id', 'disabled', 'account', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const UpdateRankSchema = CreateRankSchema.fork(['title', 'description'], schema => schema.optional());

export const SetDisabledSchema = RankSchema.extract('disabled');
