import {SuspensionListArgs} from 'api/app/suspensions/schema';
import {BarueriConfig} from 'config';
import i18n from 'i18n';
import orderBy from 'lodash/orderBy';
import Mime from 'mime';
import {Account} from 'modules/accounts/schema';
import AccountsService from 'modules/accounts/service';
import {ExportReportsType} from 'modules/async-tasks/schema';
import AsyncTasksService from 'modules/async-tasks/service';
import {getFormattedDateAndHour, mapper} from 'modules/async-tasks/utils';
import EmployeesService from 'modules/employees/service';
import {BadRequestError, ConflictError, ForbiddenError, NotFoundError} from 'modules/errors/errors';
import {ClausesType} from 'modules/feedbacks/schema';
import OrgChartsService from 'modules/orgchart/service';
import {AppUser, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';

import SuspensionTemplate from '../../templates/pdf-suspension.ejs';
import PdfService from '../../utils/pdf-service';
import StorageService from '../../utils/storage-service';
import SuspensionsRepository from './repository';
import SuspensionsMysqlRepository from './repository.mysql';
import {InternalSuspension, Suspension, SUSPENSION_STATUS, SuspensionProps} from './schema';

export default class SuspensionsService {

    static config(cfg: BarueriConfig, user: User, account: Account): SuspensionsService {
        return new SuspensionsService(
            SuspensionsRepository.config(cfg, user.id, account.id),
            UsersService.config(cfg, user, account.id),
            EmployeesService.config(cfg, user, account.id),
            PdfService.config(cfg),
            StorageService.configProtected(cfg),
            OrgChartsService.config(cfg, user, account.id),
            AccountsService.config(cfg, user.id),
            AsyncTasksService.config(cfg, user as AppUser, account.id),
            SuspensionsMysqlRepository.config(cfg),
            user,
            account,
            cfg.mailAssetsUrl,
        );
    }

    async create(employee: string, props: Pick<SuspensionProps, 'description' | 'start' | 'end'>) {
        const {sector, rank} = await this.users.retrieve(employee);
        const manager = await this.users.getManager({id: employee, sector}) as string;

        const suspensions = await this.listByEmployee(employee);
        if (this.hasOverlap(props.start, props.end, suspensions)) {
            throw new ConflictError();
        }

        return await this.repository.create({
            ...props,
            status: SUSPENSION_STATUS.DRAFT,
            employee,
            sector,
            manager,
            rank,
            account: this.account.id,
        });
    }

    async listByEmployee(employee: string) {
        await this.users.retrieve(employee);

        let list = await this.repository.listByEmployee(employee);

        if (employee === this.user.id) {
            list = list
                .filter(s => s.status === SUSPENSION_STATUS.SENT);
        }
        return orderBy(list, ['created_at'], ['desc']);
    }

    async findById(employee: string, id: string) {
        const suspension = await this._retrieve(employee, id);
        return this.toExternal(suspension);
    }

    async countByAccount(accountId: string) {
        await this.accounts.retrieve(accountId);

        const total = await this.repository.countByAccount(accountId);

        return total;
    }

    async update(employee: string, id: string, props: Pick<SuspensionProps, 'description' | 'start' | 'end'>) {
        const suspension = await this._retrieve(employee, id);

        let suspensions = await this.listByEmployee(employee);
        suspensions = suspensions.filter(s => s.id !== id);

        if (this.hasOverlap(props.start, props.end, suspensions)) {
            throw new ConflictError();
        }

        if (suspension.status !== SUSPENSION_STATUS.DRAFT) {
            throw new BadRequestError(`Cannot update if status is ${suspension.status}`);
        }

        const updated = await this.repository
            .update(suspension, props);

        return this.toExternal(updated);
    }

    async generate(employeeId: string, id: string) {
        const suspension = await this._retrieve(employeeId, id);

        if (suspension.status !== SUSPENSION_STATUS.DRAFT) {
            throw new BadRequestError(`Cannot generate doc if status is ${suspension.status}`);
        }

        const employee = await this.employees.retrieve(employeeId);
        const managerId = await this.users.getManager(employee);
        let manager = null;

        if (managerId) {
            manager = await this.employees.retrieve(managerId);
        }

        const sector = await this.orgChart
            .retrieve(employee.sector as string);

        const t = i18n(this.account.lang);
        const Key = `suspensions/${this.account.id}/${employeeId}/doc-${id}.pdf`;

        const Body = await this.pdfs.generate(SuspensionTemplate, {
            title: t('suspension.pdf.title'),
            section1: t('suspension.pdf.section1', {
                days: getDiffDays(suspension.start, suspension.end),
                startDate: moment(suspension.start).format(t('dateFormat') as string),
            }),
            description: t('suspension.pdf.descriptionPrefix'),
            paragraphs: suspension.description
                .split('\n\n')
                .map(p => p.trim())
                .filter(p => p),
            section2: t('suspension.pdf.section2'),
            notes: t('suspension.pdf.ps', {
                backDate: moment(suspension.end).add(1, 'day').format(t('dateFormat') as string),
            }),
            employeeName: employee.name,
            employeeSector: sector.name,
            employeeAvatarUrl: employee.avatarUrl || (this.assetsBaseUrl + '/Avatar.png'),
            managerName: manager?.name || t('suspension.pdf.withoutManager'),
            createdAt: moment(suspension.created_at).format('DD/MM/YYYY'),
            labels: {
                rated: t('suspension.pdf.rated'),
                name: t('suspension.pdf.name'),
                company: t('suspension.pdf.company'),
                companyName: this.account.name,
                sector: t('suspension.pdf.sector'),
                manager: t('suspension.pdf.manager'),
                onDate: t('suspension.pdf.onDate'),
                description: t('suspension.pdf.description'),
                copywright: t('suspension.pdf.copywright'),
                website: t('suspension.pdf.website'),
            },
            date: t('suspension.pdf.date'),
            managerSignature: t('suspension.pdf.managerSignature'),
            employeeSignature: t('suspension.pdf.employeeSignature'),
        });

        await this.files
            .putAttachment(Key, Body, 'suspensao.pdf');

        const result = await this.repository
            .update(suspension, {
                status: SUSPENSION_STATUS.GENERATED,
                _DocKey: Key,
            });

        return this.toExternal(result);
    }

    async attachmentUrl(employeeId: string, id: string, {ContentType, ContentDisposition, ContentLength}) {
        const suspension = await this._retrieve(employeeId, id);
        if (suspension.status !== SUSPENSION_STATUS.GENERATED) {
            throw new BadRequestError(`Cannot upload attachment if status is ${suspension.status}`);
        }

        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentTye: ${ContentType}`);
        }

        const Key = `suspensions/${this.account.id}/${employeeId}/att-${id}.${extension}`;
        const result = this.files
            .signedPost(Key, {ContentType, ContentDisposition, ContentLength});

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

        const suspensionId = fileName.replace('att-', '').split('.')[0];

        const suspension = await this._retrieve(employeeId, suspensionId);
        if (suspension.status === SUSPENSION_STATUS.GENERATED) {
            await this.repository
                .update(suspension, {
                    status: SUSPENSION_STATUS.SENT,
                });
        }
    }

    async delete(employee: string, id: string) {
        const suspension = await this._retrieve(employee, id);

        if (suspension.status === SUSPENSION_STATUS.SENT) {
            throw new ForbiddenError(`Cannot delete if status is ${suspension.status}`);
        }

        await this.repository.delete(employee, id);
    }

    async list(props: SuspensionListArgs, mongoQuery: ClausesType) {
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

    async generateAsyncReport(props: SuspensionListArgs, mongoQuery: ClausesType) {
        const query = await this.getListQuery(props, mongoQuery);
        const data = {
            type: ExportReportsType.SUSPENSION,
            query,
        };
        return this.tasks
            .createAsyncReportTask(JSON.stringify(data));
    }

    private async getListQuery(props: SuspensionListArgs, mongoQuery: ClausesType) {
        const {manager, employee, sector, deep} = props;
        const clauses: ClausesType[] = [{account: {'$eq': this.account.id}}];

        if (mongoQuery && Object.keys(mongoQuery).length > 0) {
            clauses.push(mongoQuery);
        }

        if (sector) {
            if (deep) {
                const descendants = await this.orgChart.list(sector);
                clauses.push({'sector': {'$in': descendants.map(d => d.id)}});
            } else {
                clauses.push({sector: {'$eq': sector}});
            }
        }

        if (employee) {
            clauses.push({employee: {'$eq': employee}});
        }

        if (manager) {
            clauses.push({manager: {'$eq': manager}});
        }

        clauses.push({created_at: {'$gte': props.from}});
        clauses.push({created_at: {'$lte': props.to}});

        return {'$and': clauses};
    }

    private async _retrieve(employee: string, id: string) {
        const suspension = await this.repository.retrieve(employee, id);
        if (!suspension) {
            throw new NotFoundError('Suspension not found');
        }
        return suspension;
    }

    private async toExternal(suspension: InternalSuspension): Promise<Suspension> {
        if (!suspension) {
            return suspension;
        }

        if (suspension.status === SUSPENSION_STATUS.GENERATED) {
            suspension.docUrl = await this.files
                .signedGetUrl(suspension._DocKey as string);
        } else if (suspension.status === SUSPENSION_STATUS.SENT) {
            suspension.attUrl = await this.files
                .signedGetUrl(suspension._AttKey as string);
        }
        const {_DocKey, _AttKey, ...result} = suspension;

        return result;
    }

    private hasOverlap(start: string | undefined, end: string | undefined, suspensions: Suspension[]) {
        return suspensions.some(suspension => {
            const startOverlap = start && moment(start).isSameOrBefore(moment(suspension.end)) && moment(start).isSameOrAfter(moment(suspension.start));
            const endOverlap = end && moment(end).isSameOrBefore(moment(suspension.end)) && moment(end).isSameOrAfter(moment(suspension.start));
            return startOverlap || endOverlap;
        });
    }

    async generateAsyncReportBody(query: Record<string, unknown>, account: Account) {
        const suspensionsFromDB = await this.mysql.list(query);
        if (!suspensionsFromDB.length) {
            return [];
        }

        const employees = await this.users.listByIds({
            searchIn: [
                ...suspensionsFromDB.map(suspension => suspension.created_by),
                ...suspensionsFromDB.map(suspension => suspension.employee),
                ...suspensionsFromDB.map(suspension => suspension.manager || suspension.employee),
            ],
            account: account.id,
        });

        const sectors = await this.orgChart
            .listByIds(suspensionsFromDB.map(suspension => suspension.sector || ''));

        const suspensions = suspensionsFromDB.map(suspension => ({
            'employee': employees.find(e => suspension.employee === e.id)?.name || '',
            'manager': suspension.manager ? (employees.find(e => suspension.manager === e.id)?.name || '') : '',
            'sector': sectors.find(s => suspension.sector === s.id)?.name || '',
            'created_at': getFormattedDateAndHour(suspension.created_at),
            'status': `report.suspension.status.${suspension.status.toLowerCase()}`,
            'days': getDiffDays(suspension.start, suspension.end),
        }));

        return mapper(account, ExportReportsType.SUSPENSION, suspensions);
    }

    constructor(
        private repository: SuspensionsRepository,
        private users: UsersService,
        private employees: EmployeesService,
        private pdfs: PdfService,
        private files: StorageService,
        private orgChart: OrgChartsService,
        private accounts: AccountsService,
        private tasks: AsyncTasksService,
        private mysql: SuspensionsMysqlRepository,
        private user: User,
        private account: Account,
        private assetsBaseUrl: string,
    ) {}
}

export const getDiffDays = (startDate: string, endDate: string) => {
    return moment(endDate).diff(startDate, 'days') + 1;
};
