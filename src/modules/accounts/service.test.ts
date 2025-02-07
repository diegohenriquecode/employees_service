import AccountsRepository from './repository';
import AccountsService from './service';

jest.mock('./repository');

const accountsDemo = [
    {
        timezone: 'America/Sao_Paulo',
        responsible: '74afd1fa-b0e2-4b3b-b97c-9cd8da94e048',
        name: 'Jurandi',
        subdomain: 'pioneer',
        id: 'seJurandi',
        is_demo: true,
        modules: {
            climateCheck: true,
        },
    },
    {
        timezone: 'America/Sao_Paulo',
        responsible: '74afd1fa-b0e2-4b3b-b97c-9cd8da94e048',
        name: 'Popye',
        subdomain: 'pioneer',
        id: 'popye',
        is_demo: true,
        modules: {
            climateCheck: true,
        },
    },
];

const accountsCommercial = [
    {
        timezone: 'America/Sao_Paulo',
        responsible: '74afd1fa-b0e2-4b3b-b97c-9cd8da94e048',
        name: 'Jhon Doe',
        subdomain: 'pioneer',
        id: 'jhonDoe',
        is_demo: false,
        modules: {
            climateCheck: true,
        },
    },
    {
        timezone: 'America/Sao_Paulo',
        responsible: '74afd1fa-b0e2-4b3b-b97c-9cd8da94e048',
        name: 'Pope Francis',
        subdomain: 'pioneer',
        id: 'popeFrancis',
        is_demo: false,
        modules: {
            climateCheck: true,
        },
    },
];

describe('AccountsService', () => {
    let accountsService;
    let accountsRepository;

    beforeEach(() => {
        accountsRepository = new AccountsRepository();
        accountsService = new AccountsService(
            accountsRepository,
            'test-user',
            {},
            {},
            {},
        );
    });

    describe('list', () => {
        it('should list demo accounts when is_demo is true', async () => {
            accountsRepository.listDemo.mockResolvedValue(accountsDemo);

            const result = await accountsService.list(true);

            expect(accountsRepository.listDemo).toHaveBeenCalled();
            expect(result).toEqual(accountsDemo);
        });

        it('should list commercial accounts when is_demo is false', async () => {
            accountsRepository.listComercial.mockResolvedValue(accountsCommercial);

            const result = await accountsService.list(false);

            expect(accountsRepository.listComercial).toHaveBeenCalled();
            expect(result).toEqual(accountsCommercial);
        });

        it('should filter commercial accounts by name when name is provided', async () => {
            accountsRepository.listComercial.mockResolvedValue([
                ...accountsCommercial,
                {
                    timezone: 'America/Sao_Paulo',
                    responsible: '74afd1fa-b0e2-4b3b-b97c-9cd8da94e048',
                    name: 'Special Account',
                    subdomain: 'special',
                    id: 'specialAccount',
                    is_demo: false,
                    modules: {
                        climateCheck: true,
                    },
                },
            ]);

            const result = await accountsService.list(false, 'special');

            expect(accountsRepository.listComercial).toHaveBeenCalled();
            expect(result).toEqual([{
                timezone: 'America/Sao_Paulo',
                responsible: '74afd1fa-b0e2-4b3b-b97c-9cd8da94e048',
                name: 'Special Account',
                subdomain: 'special',
                id: 'specialAccount',
                is_demo: false,
                modules: {
                    climateCheck: true,
                },
            }]);
        });

        it('should return an empty list when no commercial accounts match the filter name', async () => {
            accountsRepository.listComercial.mockResolvedValue(accountsCommercial);

            const result = await accountsService.list(false, 'nonexistent');

            expect(accountsRepository.listComercial).toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });
});
