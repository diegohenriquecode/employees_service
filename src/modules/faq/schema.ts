import Joi from '../../utils/joi';

export type Faq = {
    id: string,

    question: string,
    answer: string

    tags: string[]

    created_by: string
    created_at: string
    updated_by: string
    updated_at: string

    disabled?: boolean
};

export const FaqSchema = Joi.object<Faq>().keys({
    question: Joi.string().trim().min(3).max(255),
    answer: Joi.string().trim().min(3).max(8192),
    tags: Joi.array().items(Joi.string().trim().min(3).max(50)),
});

export type FaqProps = Pick<Faq, 'question' | 'answer'>;
