import {BarueriConfig} from 'config';
import {isEmpty, orderBy as _orderBy, uniqBy} from 'lodash';
import Mime from 'mime';
import {BadRequestError, ForbiddenError, NotFoundError} from 'modules/errors/errors';
import OrgChartsService from 'modules/orgchart/service';
import RanksService from 'modules/ranks/service';
import RolesRepository from 'modules/roles/repository';
import {TrainingProgress} from 'modules/training-progresses/schema';
import TrainingProgressesService from 'modules/training-progresses/service';
import TrainingsService from 'modules/trainings/service';
import {AppUser, User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment';
import StorageService, {FileData} from 'utils/storage-service';

import TrainingTrailsRepository from './repository';
import {CreateTrainingTrailProps, ExternalTrainingTrail, TrainingTrail, TrainingTrailCategory, TrainingTrailProps, UpdateTrainingTrailProps} from './schema';

export default class TrainingTrailsService {
    static config(cfg: BarueriConfig, user: AppUser, accountId: string): TrainingTrailsService {
        return new TrainingTrailsService(
            TrainingTrailsRepository.config(cfg, user.id, accountId),
            StorageService.configPublic(cfg),
            TrainingsService.config(cfg, user, accountId),
            TrainingProgressesService.config(cfg, user, accountId),
            RanksService.config(cfg, user, accountId),
            OrgChartsService.config(cfg, user, accountId),
            UsersService.config(cfg, user, accountId),
            RolesRepository.config(cfg, user.id, accountId),
            accountId,
            user,
        );
    }

    async create(props: CreateTrainingTrailProps) {
        await this.validateArrayProps(props);

        const trail = await this.repository.create({
            ...props,
            disabled: false,
            thumbnail_key: null,
            trainings: [],
        });

        return this.toExternal(trail);
    }

    async retrieve(id: string) {
        const trail = await this._retrieve(id);
        if (!trail) {
            throw new NotFoundError('Trail not found');
        }

        const sectors = await this.sectors.listByIds(trail.sectors);
        trail.sectors = trail.sectors.filter(sectorId => sectors.some(sector => sector.id === sectorId && !sector.removed));

        return this.toExternal(trail);
    }

    async update(id: string, props: UpdateTrainingTrailProps) {
        const current = await this._retrieve(id);

        if (
            current.employee && current.employee.length > 0
            && (props.ranks.length > 0 || props.sectors.length > 0 || props.roles.length > 0)
        ) {
            throw new BadRequestError('Cannot set ranks/sectors/roles for trails with employee set');
        }

        await this.validateArrayProps(props);

        const trail = await this.repository.update(current, props);

        return this.toExternal(trail);
    }

    async setDisabled(id: string, disabled: boolean) {
        await this.retrieve(id);

        await this.repository.patch(id, 'disabled', disabled);
    }

    async listByAccount(props?: {order: string, orderBy: string}) {
        const trails = await this.repository.listByAccount();

        const mappedTrails = await Promise.all(trails.map(this.toExternal.bind(this)));
        return isEmpty(props)
            ? mappedTrails
            : _orderBy(mappedTrails, [props.orderBy], [props.order === 'ASC' ? 'asc' : 'desc']);
    }

    async listByEmployee(employeeId: string) {
        const employee = await this.users.retrieve(employeeId);
        let trails = await this.repository.listByAccount();

        const trainingIds = trails.flatMap(trail => trail.trainings);
        const enabledTrainings = await this.trainings.listByEnableTrainingIds(trainingIds, employeeId);
        const enabledTrainingIds = enabledTrainings.map(training => training.id);

        trails = trails
            .filter(trail => trail.ranks?.length === 0 || (employee.rank && trail.ranks?.includes(employee.rank)))
            .filter(trail => !trail.sectors || trail.sectors.length === 0 || Object.keys(employee.sectors || {}).some(key => trail.sectors.includes(key)))
            .filter(trail => !trail.roles || trail.roles.length === 0 || this.checkEmployeeRoles(trail.roles, employee))
            .filter(trail => !trail.employee || trail.employee?.length === 0 || trail.employee.includes(employee.id))
            .filter(trail => !trail.disabled);

        for (const trail of trails) {
            trail.trainings = trail.trainings.filter(trainingId => enabledTrainingIds.includes(trainingId));
        }

        return Promise.all(trails.map(this.toExternal.bind(this)));
    }

    async listByCategory(sector: string, from: string, to: string) {
        const result: Record<string, Record<string, number>> = {};
        Object.keys(TrainingTrailCategory)
            .forEach(key => result[key] = {trails: 0, employees: 0});
        result['uncategorized'] = {trails: 0, employees: 0};

        const trainingTrails = (await this.repository
            .listByAccount())
            .filter(t => !t.disabled);

        if (isEmpty(trainingTrails)) {
            return result;
        }

        let employeesList: User[] = [];
        const subSectors = (await this.sectors.list(sector)).map(s => s.id);
        for (const subSector of subSectors) {
            const subSectorEmployees = await this.users.fromSector(this.account, subSector);
            employeesList.push(...subSectorEmployees as User[]);
        }
        employeesList = uniqBy(employeesList, 'id');

        const momentTo = moment(to);
        const employeesByCategory: Record<string, string[]> = {};
        Object.keys(result).forEach(category => {
            employeesByCategory[category] = [];
        });

        for (const employee of employeesList) {
            const visibleTrails = trainingTrails
                .filter(trail => trail.ranks?.length === 0 || (employee.rank && trail.ranks?.includes(employee.rank)))
                .filter(trail => !trail.sectors || trail.sectors.length === 0 || trail.sectors.includes(employee.sector))
                .filter(trail => !trail.roles || trail.roles.length === 0 || this.checkEmployeeRoles(trail.roles, employee))
                .filter(trail => !trail.employee || trail.employee?.length === 0 || trail.employee.includes(employee.id))
                .filter(trail => !trail.disabled);

            if (isEmpty(visibleTrails)) {
                continue;
            }

            const employeeTrainingProgresses = (await this.progresses.listByEmployee(employee.id))
                .filter(progress => (
                    moment(progress.created_at).isBefore(momentTo)
                    && (progress.progress !== 10000 || moment(progress.updated_at).isAfter(momentTo))
                ));

            for (const category of [...Object.keys(TrainingTrailCategory), undefined]) {
                const trainings = visibleTrails
                    .filter(t => category ? t.category === category : !t.category)
                    .map(t => t.trainings).flat();

                if (employeeTrainingProgresses.some(p => trainings.includes(p.training))) {
                    result[category || 'uncategorized'].employees++;
                }
            }
        }

        trainingTrails.forEach(trail => {
            if (trail.category) {
                result[trail.category].trails++;
            } else {
                result['uncategorized'].trails++;
            }
        });

        return result;
    }

    async listDetailedByCategory(sector: string, from: string, to: string, category: TrainingTrailCategory) {
        const trainingTrails = (await this.repository
            .listByAccount())
            .filter(t => !t.disabled && (category ? t.category === category : !t.category));

        if (isEmpty(trainingTrails)) {
            return {};
        }

        type ResultSummary = {
            finished: string[]
            progress: number
            list: string[]
        };

        const result: Record<string, ResultSummary> = {};

        for (const trail of trainingTrails) {
            result[trail.id] = {
                finished: [],
                progress: 0,
                list: [],
            };
        }

        const employeesList = await this.getEmployeesFromSector(sector);
        const momentFrom = moment(from);
        const momentTo = moment(to);

        for (const employee of employeesList) {
            const visibleTrails = this.listVisibleTrainingTrails(trainingTrails, employee);

            if (isEmpty(visibleTrails)) {
                continue;
            }

            const employeeTrainingProgresses = (await this.progresses.listByEmployee(employee.id));

            for (const trail of visibleTrails) {
                const trailProgress = employeeTrainingProgresses
                    .filter(p => moment(p.created_at).isBefore(momentTo) && trail.trainings.includes(p.training));

                if (isEmpty(trailProgress)) {
                    continue;
                }

                if (this.wasTrailFinishedOnPeriod(trail.trainings, trailProgress, momentTo, momentFrom)) {
                    result[trail.id].finished.push(employee.id);
                } else {
                    result[trail.id].progress++;
                    result[trail.id].list.push(employee.id);
                }
            }
        }

        return result;
    }

    async retrieveByEmployee(trainingTrailId: string, employeeId: string) {
        const employee = await this.users.retrieve(employeeId);
        const trainingTrail = await this.retrieve(trainingTrailId);

        if (
            trainingTrail.disabled
            || trainingTrail.ranks && trainingTrail.ranks.length > 0 && employee.rank && !trainingTrail.ranks.includes(employee.rank)
            || trainingTrail.sectors && trainingTrail.sectors.length > 0 && !trainingTrail.sectors.includes(employee.sector)
            || trainingTrail.roles && trainingTrail.roles.length > 0 && !this.checkEmployeeRoles(trainingTrail.roles, employee)
        ) {
            throw new ForbiddenError('Forbidden access to training trail');
        }

        return trainingTrail;

    }

    async getThumbnailUploadUrl(id: string, {ContentType, ContentLength}: TrainingTrailThumbnailUrlProps) {
        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${ContentType}`);
        }

        const Key = `training-trails/${this.account}/thumbnail-${id}.${extension}`;
        const url = this.files.signedPost(Key, {ContentType, ContentLength});

        await this.repository.patch(id, 'thumbnail_key', `unconfirmed:${Key}`);

        return url;
    }

    async confirmThumbnailUpload(filePath: string) {
        const [, , fileName] = filePath.split('/');
        if (!fileName.startsWith('thumbnail-')) {
            console.log('Ignoring doc write');
            return;
        }

        const id = fileName.replace('thumbnail-', '').split('.')[0];

        const trail = await this._retrieve(id);
        if (trail.thumbnail_key === `unconfirmed:${filePath}`) {
            await this.repository.patch(id, 'thumbnail_key', filePath);
        }
    }

    private async validateArrayProps(props: Partial<TrainingTrailProps>) {
        const fields = [];

        if (props.trainings) {
            const trainingsInAccount = (await this.trainings.listByAccount()).map(t => t.id);
            if (!props.trainings.every(t => trainingsInAccount.includes(t))) {
                fields.push('trainings');
            }
        }

        if (props.ranks) {
            const ranksInAccount = (await this.ranks.list()).map(r => r.id);
            if (!props.ranks.every(r => ranksInAccount.includes(r))) {
                fields.push('ranks');
            }
        }

        if (props.sectors) {
            const sectorsInAccount = (await this.sectors.list()).map(s => s.id);
            if (!props.sectors.every(s => sectorsInAccount.includes(s))) {
                fields.push('sectors');
            }
        }

        if (props.roles) {
            const rolesInAccount = (await this.roles.list(true)).map(r => r.id);
            if (!props.roles.every(r => rolesInAccount.includes(r))) {
                fields.push('roles');
            }
        }

        if (props.employee) {
            const validEmployeeIds = (await this.users.list({account: this.account, includeDisabled: true}))
                .items.map(user => user.id);
            if (!props.employee.every(employeeId => validEmployeeIds.includes(employeeId))) {
                fields.push('employee');
            }
        }

        if (fields.length > 0) {
            throw new BadRequestError(`One or more ${fields} does not exist in account`);
        }
    }

    private async toExternal(trail: TrainingTrail): Promise<ExternalTrainingTrail> {
        if (!trail) {
            return trail;
        }

        const {thumbnail_key, ...result} = trail;

        let thumbnail = null;
        if (thumbnail_key && !thumbnail_key.startsWith('unconfirmed:')) {
            thumbnail = await this.files.signedGetUrl(thumbnail_key.replace('unconfirmed:', ''), {Expires: 3600});
        }

        return {...result, thumbnail};
    }

    private async _retrieve(id: string) {

        const trail = await this.repository.retrieve(id);
        const trainings = await this.trainings.listByIds(trail.trainings);

        return {...trail, trainings: trainings.map(t => t.id)};
    }

    private checkEmployeeRoles(trainingTrailRoles: string[], employee: Omit<User, 'password'>) {
        if (!trainingTrailRoles?.length) {
            return false;
        }

        const employeeRoles: string[] = [employee.roles];
        const isManager: boolean = employee.sectors
            && Object.keys(employee.sectors).some(sector => employee.sectors[sector].is_manager);

        if (isManager) {
            employeeRoles.push('manager');
        }

        return trainingTrailRoles.some(r => employeeRoles.includes(r));
    }

    private listVisibleTrainingTrails(trainingTrails: TrainingTrail[], employee: User) {
        return trainingTrails
            .filter(trail => trail.ranks?.length === 0 || (employee.rank && trail.ranks?.includes(employee.rank)))
            .filter(trail => !trail.sectors || trail.sectors.length === 0 || trail.sectors.includes(employee.sector))
            .filter(trail => !trail.roles || trail.roles.length === 0 || this.checkEmployeeRoles(trail.roles, employee))
            .filter(trail => !trail.employee || trail.employee?.length === 0 || trail.employee.includes(employee.id))
            .filter(trail => !trail.disabled);
    }

    private async getEmployeesFromSector(sector: string) {
        const employeesList: User[] = [];
        const subSectors = (await this.sectors.list(sector)).map(s => s.id);
        for (const subSector of subSectors) {
            const subSectorEmployees = await this.users.fromSector(this.account, subSector);
            employeesList.push(...subSectorEmployees as User[]);
        }
        return uniqBy(employeesList, 'id');
    }

    private wasTrailFinishedOnPeriod(trainings: string[], trailProgress: TrainingProgress[], to: moment.Moment, from: moment.Moment) {
        return trailProgress.some(p => moment(p.updated_at).isAfter(from))
            && trainings.every(training => {
                const progressFromTraining = trailProgress.find(p => p.training === training);
                return progressFromTraining
                    && progressFromTraining.progress === 10000
                    && moment(progressFromTraining.updated_at).isBefore(to);
            });
    }

    constructor(
        private repository: TrainingTrailsRepository,
        private files: StorageService,
        private trainings: TrainingsService,
        private progresses: TrainingProgressesService,
        private ranks: RanksService,
        private sectors: OrgChartsService,
        private users: UsersService,
        private roles: RolesRepository,
        private account: string,
        private user: AppUser,
    ) { }
}

export type TrainingTrailThumbnailUrlProps = Required<Pick<FileData, 'ContentType' | 'ContentLength'>>;
