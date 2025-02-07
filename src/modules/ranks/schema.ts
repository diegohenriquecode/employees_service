import Joi from '../../utils/joi';

export enum HierarchicalLevel {
    Presidency = 'Presidency',
    Director = 'Director',
    Management = 'Management',
    Supervision = 'Supervision',
    Operational = 'Operational',
}

export const RankSchema = Joi.object<Rank>().keys({
    id: Joi.string(),

    title: Joi.string().trim().min(3).max(255),
    description: Joi.string().min(1).max(8192),
    disabled: Joi.boolean(),

    account: Joi.string(),

    hierarchical_level: Joi.string().valid(...Object.values(HierarchicalLevel)),

    responsibilities: Joi.string().optional().allow(null),
    requirements: Joi.string().optional().allow(null),
    desired: Joi.string().optional().allow(null),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type RankProps = {
    title: string
    description: string
    disabled: boolean
    hierarchical_level: keyof typeof HierarchicalLevel
    responsibilities: string | null
    requirements: string | null
    desired: string | null

    account: string
};

export type Rank = RankProps & {
    id: string

    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};
