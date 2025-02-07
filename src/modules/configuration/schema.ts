import Joi from '../../utils/joi';

export type Configuration = {
    accountId: string,
    usersCanEditAvatar: boolean,

    created_by: string
    created_at: string
    updated_by: string
    updated_at: string
};

export const ConfigurationSchema = Joi.object<Configuration>().keys({
    usersCanEditAvatar: Joi.boolean().required(),
});

export type ConfigurationProps = Pick<Configuration, 'usersCanEditAvatar'>;
