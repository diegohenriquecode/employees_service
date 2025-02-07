import {ReprimandListArgs} from 'api/app/reprimands/schema';
import {BarueriConfig} from 'config';
import i18n from 'i18n';
import orderBy from 'lodash/orderBy';
import uniq from 'lodash/uniq';
import Mime from 'mime';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {ExportReportsType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {getFormattedDate, getFormattedDateAndHour, mapper} from 'modules/async-tasks/utils';
import EmployeesService from 'modules/employees/service';
import {BadRequestError, ForbiddenError, NotFoundError} from 'modules/errors/errors';
import {ClausesType} from 'modules/feedbacks/schema';
import OrgChartsService from 'modules/orgchart/service';
import RanksService from 'modules/ranks/service';
import {AppUser, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import ReprimandTemplate from '../../templates/pdf-reprimand.ejs';
import PdfService from '../../utils/pdf-service';
import StorageService from '../../utils/storage-service';
import ReprimandsRepository from './repository';
import ReprimandsMysqlRepository from './repository.mysql';
import {ReprimandProps, REPRIMAND_STATUS, InternalReprimand, Reprimand} from './schema';

export default class ReprimandsService {

    static config(cfg: BarueriConfig, user: User, account: Account): ReprimandsService {
        return new ReprimandsService(
            ReprimandsRepository.config(cfg, user.id, account.id),
            UsersService.config(cfg, user, account.id),
            EmployeesService.config(cfg, user, account.id),
            OrgChartsService.config(cfg, user, account.id),
            RanksService.config(cfg, user, account.id),
            PdfService.config(cfg),
            StorageService.configProtected(cfg),
            AccountsService.config(cfg, user.id),
            cfg.mailAssetsUrl,
            ReprimandsMysqlRepository.config(cfg),
            AsyncTasksService.config(cfg, user as AppUser, account.id),
            account,
            user,
        );
    }

    async create(employee: User, props: Pick<ReprimandProps, 'description' | 'sector'>) {
        const {sector, rank, sectors} = employee;

        if (!Object.keys(sectors).includes(props.sector)) {
            throw new BadRequestError('Employee doesn\'t belongs to sector');
        }

        const currentSector = props.sector || sector;
        const manager = await this.users.getManager({id: employee.id, sector: currentSector}) as string;

        return await this.repository.create({
            ...props,
            status: REPRIMAND_STATUS.DRAFT,
            employee: employee.id,
            sector: currentSector,
            manager,
            rank,
            account: this.account.id,
        });
    }

    async listByEmployee(employee: User) {
        let list = await this.repository.listByEmployee(employee.id);

        if (employee.id === this.user.id) {
            list = list
                .filter(s => s.status === REPRIMAND_STATUS.SENT);
        }

        return orderBy(list, ['created_at'], ['desc']);
    }

    async findById(employee: string, id: string) {
        const reprimand = await this._retrieve(employee, id);
        return this.toExternal(reprimand);
    }

    async countByAccount(accountId: string) {
        await this.accounts.retrieve(accountId);

        const total = await this.repository.countByAccount(accountId);

        return total;
    }

    async update(employee: string, id: string, props: Pick<ReprimandProps, 'description'>) {
        const reprimand = await this._retrieve(employee, id);

        if (reprimand.status !== REPRIMAND_STATUS.DRAFT) {
            throw new BadRequestError(`Cannot update if status is ${reprimand.status}`);
        }

        const updated = await this.repository
            .update(reprimand, props);

        return this.toExternal(updated);
    }

    async generate(employeeId: string, id: string) {
        const reprimand = await this._retrieve(employeeId, id);
        if (reprimand.status !== REPRIMAND_STATUS.DRAFT) {
            throw new BadRequestError(`Cannot generate doc if status is ${reprimand.status}`);
        }

        const [employee, manager] = await Promise.all([
            this.employees.retrieve(employeeId),
            this.users.retrieve(reprimand.created_by),
        ]);

        const rank = await this.ranks.retrieve(employee.rank);
        const sector = await this.orgChart
            .retrieve(employee.sector as string);

        const t = i18n(this.account.lang);
        const Key = `reprimands/${this.account.id}/${employeeId}/doc-${id}.pdf`;
        const Body = await this.pdfs.generate(ReprimandTemplate, {
            date: t('reprimand.pdf.date'),
            employeeSignature: t('reprimand.pdf.employeeSignature'),
            managerSignature: t('reprimand.pdf.managerSignature'),
            employeeName: employee.name,
            employeeSector: sector.name,
            employeeAvatarUrl: employee.avatarUrl || (this.assetsBaseUrl + '/Avatar.png'),
            managerName: manager.name,
            createdAt: moment(reprimand.created_at).format('DD/MM/YYYY'),
            labels: {
                rated: t('reprimand.pdf.rated'),
                name: t('reprimand.pdf.name'),
                company: t('reprimand.pdf.company'),
                companyName: this.account.name,
                sector: t('reprimand.pdf.sector'),
                manager: t('reprimand.pdf.manager'),
                onDate: t('reprimand.pdf.onDate'),
                description: t('reprimand.pdf.description'),
                copywright: t('reprimand.pdf.copywright'),
                website: t('reprimand.pdf.website'),
            },
            paragraphs: reprimand.description
                .split('\n\n')
                .map(p => p.trim())
                .filter(p => p),
            section1: t('reprimand.pdf.section1', {
                employeeName: employee.name,
                employeeRank: rank.title,
                managerName: manager.name,
            }),
            title: t('reprimand.pdf.title'),
        });

        await this.files
            .putAttachment(Key, Body, 'advertencia.pdf');

        const result = await this.repository
            .update(reprimand, {
                status: REPRIMAND_STATUS.GENERATED,
                _DocKey: Key,
            });

        return this.toExternal(result);
    }

    async attachmentUrl(employeeId: string, id: string, {ContentType, date, ContentDisposition, ContentLength}) {
        const reprimand = await this._retrieve(employeeId, id);
        if (reprimand.status !== REPRIMAND_STATUS.GENERATED) {
            throw new BadRequestError(`Cannot upload attachment if status is ${reprimand.status}`);
        }

        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentTye: ${ContentType}`);
        }

        const Key = `reprimands/${this.account.id}/${employeeId}/att-${id}.${extension}`;
        const result = this.files
            .signedPost(Key, {ContentType, ContentDisposition, ContentLength, Metadata: {date}});

        await this.repository
            .patch(employeeId, id, '_AttKey', Key);

        return result;
    }

    async confirmUpload(filePath: string) {
        const [,, employeeId, fileName] = filePath.split('/');
        if (!fileName.startsWith('att-')) {
            console.log('Ignoring doc write');
            return;
        }

        const reprimandId = fileName.replace('att-', '').split('.')[0];

        const reprimand = await this._retrieve(employeeId, reprimandId);
        if (reprimand.status === REPRIMAND_STATUS.GENERATED) {
            const {date} = await this.files.metadata(filePath);
            await this.repository
                .update(reprimand, {
                    status: REPRIMAND_STATUS.SENT,
                    date,
                });
        }
    }

    async delete(employee: string, id: string) {
        const reprimand = await this._retrieve(employee, id);

        if (reprimand.status === REPRIMAND_STATUS.SENT) {
            throw new ForbiddenError(`Cannot delete if status is ${reprimand.status}`);
        }

        await this.repository.delete(employee, id);
    }

    async list(props: ReprimandListArgs, mongoQuery: ClausesType) {

        const {page, pageSize, order} = props;

        const query = await this.getListQuery(props, mongoQuery);

        const [total, items] = await Promise.all([
            this.mysql.count(query),
            this.mysql.list(query, {
                pagination: {page, pageSize},
                ordering: {order, orderBy: props.orderBy},
            }),
        ]);

        return {
            items,
            page,
            pageSize,
            total,
        };
    }

    private async _retrieve(employee: string, id: string) {
        const reprimand = await this.repository.retrieve(employee, id);
        if (!reprimand) {
            throw new NotFoundError('Reprimand not found');
        }
        return reprimand;
    }

    private async toExternal(reprimand: InternalReprimand): Promise<Reprimand> {
        if (!reprimand) {
            return reprimand;
        }

        if (reprimand.status === REPRIMAND_STATUS.GENERATED) {
            reprimand.docUrl = await this.files
                .signedGetUrl(reprimand._DocKey as string);
        } else if (reprimand.status === REPRIMAND_STATUS.SENT) {
            reprimand.attUrl = await this.files
                .signedGetUrl(reprimand._AttKey as string);
        }
        const {_DocKey, _AttKey, ...result} = reprimand;

        return result;
    }

    private async getListQuery(props: ReprimandListArgs, mongoQuery: ClausesType) {
        const {created_by, employee, manager, sector, deep} = props;
        const clauses: ClausesType[] = [{account: {'$eq': this.account.id}}];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        if (created_by) {
            clauses.push({created_by: {'$eq': created_by}});
        }

        if (manager) {
            clauses.push({manager: {'$eq': manager}});
        }

        if (employee) {
            clauses.push({employee: {'$eq': employee}});
        }

        if (sector) {
            if (deep) {
                const descendants = await this.orgChart.list(sector);
                clauses.push({'sector': {'$in': descendants.map(d => d.id)}});
            } else {
                clauses.push({sector: {'$eq': sector}});
            }
        } else {
            const managerOf = Object.keys(this.user.sectors).filter(s => this.user.sectors[s].is_manager);
            if (managerOf.length > 0) {
                const descendants = (await Promise.all(managerOf.map(s => this.orgChart.list(s)))).flat();
                clauses.push({'sector': {'$in': uniq(descendants.map(d => d.id))}});
            }
        }

        clauses.push({created_at: {'$gte': props.from}});
        clauses.push({created_at: {'$lte': props.to}});

        return {'$and': clauses};
    }

    async generateAsyncReport(props: ReprimandListArgs, mongoQuery: ClausesType) {
        const query = await this.getListQuery(props, mongoQuery);
        const data = {
            type: ExportReportsType.REPRIMAND,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    async generateAsyncReportBody(query: Record<string, unknown>, account: Account) {
        const reprimandsFromDB = await this.mysql.list(query);
        if (!reprimandsFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: [
                ...reprimandsFromDB.map(reprimand => reprimand.created_by),
                ...reprimandsFromDB.map(reprimand => reprimand.employee),
                ...reprimandsFromDB.map(reprimand => reprimand.manager || reprimand.employee),
            ],
            account: account.id,
        });

        const sectors = await this.orgChart
            .listByIds(reprimandsFromDB.map(reprimand => reprimand.sector || ''));

        const reprimands = reprimandsFromDB.map(reprimand => ({
            'employee': employees.find(e => reprimand.employee === e.id)?.name || '',
            'manager': employees.find(e => reprimand.manager === e.id)?.name || '',
            'created_at': getFormattedDateAndHour(reprimand.created_at),
            'updated_at': getFormattedDateAndHour(reprimand.updated_at),
            'date': reprimand.date ? getFormattedDate(reprimand.date) : '',
            'sector': sectors.find(s => reprimand.sector === s.id)?.name || '',
            'status': `report.reprimand.status.${reprimand.status.toLowerCase()}`,
        }));

        return mapper(account, ExportReportsType.REPRIMAND, reprimands);
    }

    constructor(
        private repository: ReprimandsRepository,
        private users: UsersService,
        private employees: EmployeesService,
        private orgChart: OrgChartsService,
        private ranks: RanksService,
        private pdfs: PdfService,
        private files: StorageService,
        private accounts: AccountsService,
        private assetsBaseUrl: string,
        private mysql: ReprimandsMysqlRepository,
        private tasks: AsyncTasksService,
        private account: Account,
        private user: User,
    ) {}
}
