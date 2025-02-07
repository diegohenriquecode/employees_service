import {init} from '@paralleldrive/cuid2';
import {AccountDTO, InPayloadResponsible} from 'api/admin/accounts/schema';
import {BarueriConfig} from 'config';
import omit from 'lodash/omit';
import Mime from 'mime';
import {BadRequestError, ConflictError, NotFoundError} from 'modules/errors/errors';
import {ROOT_ID} from 'modules/orgchart/repository';
import {initialRoles} from 'modules/roles/schema';
import RolesService from 'modules/roles/service';
import {AppUser, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';
import StorageService, {FileData} from 'utils/storage-service';
import {v4 as uuidV4} from 'uuid';

import AccountsRepository from './repository';
import {Account, AccountProps, AccountStatus} from './schema';

export default class AccountsService {
    static config(cfg: BarueriConfig, user: string): AccountsService {
        return new AccountsService(
            AccountsRepository.config(cfg, user),
            user,
            cfg,
            StorageService.configPublic(cfg),
            StorageService.configProtected(cfg),
        );
    }

    async create(props: Pick<AccountProps, 'name' | 'subdomain' | 'max_users' | 'timezone' | 'is_demo' | 'modules'>, responsible: InPayloadResponsible): Promise<AccountDTO> {

        const subdomain = props.is_demo ? `${props.subdomain}-demo` : props.subdomain;
        validateSubdomain(subdomain);

        const bySubdomain = await this.findBySubdomain(subdomain);
        if (bySubdomain) {
            throw new ConflictError();
        }

        let account = null;
        let responsibleId = uuidV4();

        if (props.is_demo) {
            const jsonReadAccount = await this.protectedFiles.readJsonFile('template-demo/tables/BarueriAccount.json');

            if (jsonReadAccount) {
                const accountId = uuidV4();
                const readAccount = JSON.parse(jsonReadAccount?.replaceAll('${ACCOUNT_ID}', accountId));
                responsibleId = readAccount.responsible;

                account = await this.repository.create({
                    ...omit(readAccount, ['meta']),
                    ...props,
                    subdomain,
                    disabled: false,
                    status: AccountStatus.preparing,
                    id: accountId,
                });
            }

        } else {
            account = await this.repository.create({...props, subdomain, disabled: false, responsible: '', status: AccountStatus.ready});
        }

        if (account) {
            const rolesService = RolesService.config(this.cfg, {id: this.user} as AppUser, account);
            for (const toAdd of initialRoles) {
                const now = moment().toISOString();
                const Item = {
                    id: toAdd,
                    account: account.id,
                    name: toAdd,
                    private: toAdd === 'admin',
                    permissions: [],
                    created_at: now,
                    updated_at: now,
                    created_by: this.user,
                    updated_by: this.user,
                };
                await rolesService.create(Item);
            }
        }

        const responsibleUser = await UsersService.config(this.cfg, {id: this.user} as User, account.id).create({
            username: responsible.email,
            email: responsible.email,
            name: responsible.name,
            password: responsible.password,
            account: account.id,
            sector: ROOT_ID,
            roles: 'admin',
            rank: null,
            id: responsibleId,
        });
        const updatedAccount = await this.repository.update(account, {responsible: responsibleUser.id});
        return this.toExternal(updatedAccount, {email: responsible.email, name: responsible.name});

    }

    async listAll() {
        return await this.repository.list();
    }

    async list(is_demo: boolean, name?: string) {
        let list;

        is_demo
            ? list = await this.repository.listDemo()
            : list = await this.repository.listComercial();

        if (name) {
            list = list.filter((account) => {
                return account.name && account.name.toLocaleLowerCase().includes(name.toLocaleLowerCase());
            });
        }

        return list;
    }

    async findById(id: string): Promise<AccountDTO> {
        const account = await this.retrieve(id);

        let responsible;
        if (account.responsible) {
            responsible = await UsersService.config(this.cfg, {id: this.user} as User, account.id)
                .retrieve(account.responsible);
        }

        return this.toExternal(account, responsible);
    }

    async update(id: string, props: Pick<AccountProps, 'name' | 'subdomain' | 'modules' | 'timezone'>, responsible?: Partial<InPayloadResponsible>): Promise<AccountDTO> {
        let account = await this.retrieve(id);
        const accountSubdomain = (props.subdomain || account.subdomain).replace(/-demo$/, '');

        const subdomain = account.is_demo ? `${accountSubdomain}-demo` : accountSubdomain;

        const timezone = props.timezone || account.timezone;
        const updateProps = {...props, subdomain, timezone};
        if (
            props.subdomain &&
            (subdomain !== account.subdomain)
        ) {
            validateSubdomain(subdomain);
            const bySubdomain = await this.findBySubdomain(subdomain);
            if (bySubdomain) {
                throw new ConflictError();
            }
        }

        const usersService = UsersService.config(this.cfg, {id: this.user} as User, account.id);
        const responsibleUser = await usersService.retrieve(account.responsible);
        if (responsible) {
            await usersService.update(account.responsible, {
                username: responsible.email ?? responsibleUser.email,
                ...responsible,
            });
        }

        if (props.name || props.subdomain || props.modules || props.timezone) {
            account = await this.repository.update(account, updateProps);
        }

        return this.toExternal(account, responsibleUser);
    }

    async updateResponsiblePassword(accountId: string, password: string) {
        const account = await this.retrieve(accountId);

        const usersService = UsersService.config(this.cfg, {id: this.user} as User, account.id);
        const responsibleUser = await usersService.retrieve(account.responsible);
        if (password) {
            await usersService.update(account.responsible, {
                ...responsibleUser,
                password,
            });
        }
    }

    async pathUrl(id: string, {ContentType, ContentLength}: Required<Pick<FileData, 'ContentType' | 'ContentLength'>>) {
        const extension = Mime.getExtension(ContentType);

        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${ContentType}`);
        }

        const isPDF = extension.toLocaleLowerCase() === 'pdf';

        const createId = init({length: 6});

        const Key = `accounts/${id}/${isPDF ? 'contract' : 'logo'}-${createId()}.${extension}`;

        await this.repository
            .patch(id, `${isPDF ? 'contract_key' : 'logo_key'}`, `unconfirmed:${Key}`);

        let result;
        if (!isPDF) {
            result = this.publicFiles
                .signedPost(Key, {ContentType, ContentLength});
        } else {
            result = this.protectedFiles
                .signedPost(Key, {ContentType, ContentLength});
        }

        return result;
    }

    async confirmUpload(filePath: string) {
        const [, accountId, fileName] = filePath.split('/');
        if (!fileName?.startsWith('logo-') && !fileName?.startsWith('contract-')) {
            console.log('Ignoring doc write');
            return;
        }

        const account = await this.repository.retrieve(accountId);

        if (fileName.startsWith('logo-') && account.logo_key === `unconfirmed:${filePath}`) {
            return await this.repository.patch(accountId, 'logo_key', filePath);
        }

        if (fileName.startsWith('contract-') && account.contract_key === `unconfirmed:${filePath}`) {
            return await this.repository.patch(accountId, 'contract_key', filePath);
        }
    }

    async setDisabled(id: string, value: boolean) {
        await this.repository
            .patch(id, 'disabled', value);
    }

    async setExpiryDate(id: string, expiry_date?: Date) {
        await this.repository
            .patch(id, 'expiry_date', expiry_date || '');
    }

    async setStatus(id: string, value: AccountStatus) {
        await this.repository
            .patch(id, 'status', value);
    }

    async findBySubdomain(subdomain: string) {
        const account = await this.repository.findBySubdomain(subdomain);

        if (!account) {
            return null;
        }

        return this.outWithLogoUrl(account);
    }

    async retrieve(id: string) {
        const account = await this.repository.retrieve(id);

        if (!account) {
            throw new NotFoundError('Account not found');
        }

        return account;
    }

    private outWithLogoUrl(account: Account) {
        if (!account) {
            return account;
        }

        let logoUrl;

        const {logo_key, ...result} = account;
        if (logo_key && !logo_key.startsWith('unconfirmed:')) {
            logoUrl = `${this.cfg.publicAssetsUrl}/${logo_key.replace('unconfirmed:', '')}`;
        }
        return {
            logoUrl,
            ...result,
        };
    }

    private async toExternal(account: Account, responsible?: {email?: string, name: string}): Promise<AccountDTO> {
        if (!account) {
            return account;
        }

        let logoUrl, contractUrl;

        const {logo_key, contract_key, ...result} = account;
        if (logo_key && !logo_key.startsWith('unconfirmed:')) {
            logoUrl = this.publicFiles.url(logo_key.replace('unconfirmed:', ''));
        }

        if (contract_key && !contract_key.startsWith('unconfirmed:')) {
            contractUrl = await this.protectedFiles.signedGetUrl(contract_key.replace('unconfirmed:', ''));
        }

        return {
            logoUrl,
            contractUrl,
            ...result,
            subdomain: account.is_demo && account.subdomain.includes('-demo') ? account.subdomain.split('-demo')[0] : account.subdomain,
            responsible: responsible
                ? {name: responsible.name, email: responsible.email}
                : {},
        };
    }

    constructor(
        private repository: AccountsRepository,
        private user: string,
        private cfg: BarueriConfig,
        private publicFiles: StorageService,
        private protectedFiles: StorageService,
    ) {}
}

const validateSubdomain = (subdomain: string) => {
    if (['api', 'admin'].includes(subdomain)) {
        throw new ConflictError('Subdomain cannot be \'admin\' | \'api\'');
    }
};
