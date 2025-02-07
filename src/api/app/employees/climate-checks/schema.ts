import {ClimateCheckSchema} from '../../../../modules/climate-checks/schema';

export const ClimateCheckResponse = ClimateCheckSchema
    .fork(['account', 'employee', 'rank'], (schema) => schema.forbidden());
