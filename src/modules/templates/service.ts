import {BarueriConfig} from 'config';
import Enjoi from 'enjoi';
import {ValidationResult} from 'joi';
import orderBy from 'lodash/orderBy';
import {Account} from 'modules/accounts/schema';
import {BadRequestError, ConflictError, NotFoundError, ValidationError} from 'modules/errors/errors';
import {User} from 'modules/users/schema';

import TemplatesRepository from './repository';
import {TemplatesByType, Template, TemplateSchema} from './schema';

export default class TemplatesService {

    static config(cfg: BarueriConfig, user: User, account: Account): TemplatesService {
        return new TemplatesService(
            TemplatesRepository.config(cfg, user.id),
            account,
        );
    }

    async create(props: Template) {
        const template = TemplatesByType[props.type];
        detailValidation(validateSchema(template).validate(props.properties));

        const templates = await this.repository.list(this.account.id, props.type) as Template[];
        const select = templates.find(
            (item) =>
                item.properties.title.toLocaleLowerCase() ===
            props.properties.title.toLocaleLowerCase(),
        );

        if (select) {
            throw new ConflictError('A template already exists with this title');
        }

        return await this.repository.create({
            ...props,
            account: this.account.id,
        });
    }

    async list(type: string) {
        const list = await this.repository.list(this.account.id, type);
        return orderBy(list, ['created_at']);
    }

    async update(id: string, props: Template) {
        const template = (await this._retrieve(id)) as Template;

        if (template.type !== props.type) {
            throw new BadRequestError('The template type cannot be changed');
        }

        const templates = await this.repository.list(this.account.id, props.type) as Template[];
        const select = templates.find((item) =>
            item.properties.title.toLocaleLowerCase() === props.properties.title.toLocaleLowerCase() &&
            item.id !== template.id,
        );

        if (select) {
            throw new ConflictError('A template already exists with this title');
        }

        const templateSchema = TemplatesByType[props.type];
        detailValidation(validateSchema(templateSchema).validate(props.properties));

        const updated = await this.repository
            .update(template, props);

        return updated;
    }

    async retrieve(id: string) {
        return await this._retrieve(id);
    }

    async delete(id: string) {
        const template = (await this._retrieve(id)) as Template;

        await this.repository.delete(template);
    }

    private async _retrieve(id: string) {
        const template = await this.repository.retrieve(this.account.id, id);
        if (!template) {
            throw new NotFoundError('Template not found');
        }
        return template;
    }

    constructor(
        private repository: TemplatesRepository,
        private account: Account,
    ) {}
}

function validateSchema(template: TemplateSchema) {
    return Enjoi.schema({
        type: 'object',
        ...template,
        additionalProperties: false,
    }).unknown(false);
}

function detailValidation(result: ValidationResult) {
    if (result.error) {
        const details = result.error.details.map(d => d.message);
        throw new ValidationError('Validation error', details);
    }
}
