import {AccountSchema} from 'modules/accounts/schema';

import Joi from '../../utils/joi';

// Matches a valid CSS color, it can be one of hex, rgb, rgba, hsl, hsla.
export const colorRegex = /^#([\da-f]{3}){1,2}$|^#([\da-f]{4}){1,2}$|(rgb|hsl)a?\((\s*-?\d+%?\s*,){2}(\s*-?\d+%?\s*,?\s*\)?)(,\s*(0?\.\d+)?|1)?\)/;
// https://www.regextester.com/103656

export const SectorSchema = Joi.object<Sector>().keys({
    id: Joi.alternatives().try(Joi.string(), Joi.string().valid('root')),

    account: AccountSchema.extract('id'),
    manager: Joi.string().allow(null),

    name: Joi.string().max(255),
    color: Joi.string().pattern(colorRegex),
    path: Joi.string(),
    removed: Joi.boolean(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type SectorProps = {
    name: string
    color: string
    path: string // exemplo: root;sector1;sector2
    removed: boolean
    manager: string | null

    account: string
};

export type Sector = SectorProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type TreeSector = Pick<Sector, 'id' | 'manager' | 'color' | 'name'> & {
    children: TreeSector[]
    path?: string
};
