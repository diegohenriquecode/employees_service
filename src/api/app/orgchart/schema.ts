import {SectorSchema} from 'modules/orgchart/schema';

import Joi from '../../../utils/joi';

export type FindQueryArgs = {
    from?: string
    tree?: boolean
    includeRemoved?: boolean,
};

export type PatchSectorQueryArgs = {
    dedicatedManager: boolean
};

export const FindQueryArgsSchema = Joi.object<FindQueryArgs>().keys({
    from: SectorSchema.extract('id').optional(),
    tree: Joi.boolean().optional().default(true),
    includeRemoved: Joi.boolean().optional().default(false),
});

export type SectorEmployeesQueryArgs = {
    from?: string
    page: number
    pageSize: number
};

export const SectorEmployeesQueryArgsSchema = Joi.object().keys({
    from: SectorSchema.extract('id').optional(),
    page: Joi.number().integer().min(0).optional().default(0),
    pageSize: Joi.number().integer().min(1).max(100).optional().default(10),
    search: Joi.string().trim().optional(),
    searchIn: Joi.array().items(Joi.string().valid('name')).optional(),
});

export const CreateSectorSchema = SectorSchema.fork(['id', 'account', 'manager', 'path', 'removed', 'created_at', 'created_by', 'updated_at', 'updated_by'], schema => schema.forbidden());

export const MoveSectorSchema = Joi.object().keys({id: SectorSchema.extract(['id'])});

export const UpdateSectorSchema = CreateSectorSchema.fork(['name', 'color', 'manager'], schema => schema.optional());

export const patchSectorQuerySchema = Joi.object<PatchSectorQueryArgs>().keys({
    dedicatedManager: Joi.boolean().optional().default(false),
});
