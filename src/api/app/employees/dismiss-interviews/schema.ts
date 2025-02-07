import pick from 'lodash/pick';
import {CreateDismissInterviewProps, DismissInterviewSchemaMap} from 'modules/dismiss-interviews/schema';
import Joi from 'utils/joi';

export const CreateDismissInterviewSchema = Joi.object<CreateDismissInterviewProps, true>(
    pick(DismissInterviewSchemaMap, 'details', 'dismissed_at'),
);
