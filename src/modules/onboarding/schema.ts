import Joi from '../../utils/joi';

export type OnboardingItem = {
    viewed: boolean,
    skipped: boolean
};

export type Onboarding = {
    features: object,
    geralSkipped: boolean

};

export type OnboardingUpdate = {
    [key: string]: OnboardingItem,
};

const onboardingItemSchema = Joi.object<OnboardingItem>({
    viewed: Joi.boolean(),
    skipped: Joi.boolean().invalid(Joi.ref('viewed')),
});

export const onboardingUpdateSchema = Joi.object().pattern(Joi.string(), onboardingItemSchema);
