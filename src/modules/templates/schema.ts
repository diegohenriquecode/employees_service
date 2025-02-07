import {FeedbackType} from 'modules/feedbacks/schema';

export const TemplateTypes = {
    Feedback: 'Feedback',
    Reprimand: 'Reprimand',
    Suspension: 'Suspension',
};

const basePropertiesTemplate = {
    title: {type: 'string', minLength: 1, maxLength: 60},
    text: {type: 'string', minLength: 1, maxLength: 8192},
};

export const TemplatesByType = {
    [TemplateTypes.Feedback]: {
        properties: {
            ...basePropertiesTemplate,
            type: {type: 'string', enum: Object.values(FeedbackType)},
        },
        required: ['title', 'text', 'type'],
    },
    [TemplateTypes.Reprimand]: {
        properties: {
            ...basePropertiesTemplate,
        },
        required: ['title', 'text'],
    },
    [TemplateTypes.Suspension]: {
        properties: {
            ...basePropertiesTemplate,
        },
        required: ['title', 'text'],
    },
};

export type TemplateProperties = {
    title: string
    type? :string
    text: string
};

export type Template = {
    id: string,
    account: string,
    type: string
    properties: TemplateProperties
};

export type TemplateSchema =
  | typeof TemplatesByType.Feedback
  | typeof TemplatesByType.Suspension;
