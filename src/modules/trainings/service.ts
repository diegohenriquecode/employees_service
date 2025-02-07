import {BarueriConfig} from 'config';
import {compact, orderBy as _orderBy, uniq, isEmpty} from 'lodash';
import Mime from 'mime';
import AccountsService from 'modules/accounts/service';
import {BadRequestError, ForbiddenError, NotFoundError} from 'modules/errors/errors';
import RolesService from 'modules/roles/service';
import TrainingProgressesRepository from 'modules/training-progresses/repository';
import {TrainingTopic} from 'modules/training-topics/schema';
import {AppUser} from 'modules/users/schema';
import StorageService, {FileData} from 'utils/storage-service';

import TrainingsRepository from './repository';
import {CreateTrainingProps, ExternalTraining, Training, UpdateTrainingProps} from './schema';

export default class TrainingsService {
    static config(cfg: BarueriConfig, user: AppUser, accountId: string): TrainingsService {
        return new TrainingsService(
            TrainingsRepository.config(cfg, user.id, accountId),
            StorageService.configPublic(cfg),
            AccountsService.config(cfg, user.id),
            TrainingProgressesRepository.config(cfg, user.id, accountId),
            accountId,
            user,
        );
    }

    async create(props: CreateTrainingProps) {
        const training = await this.repository.create({
            ...props,
            topics: [],
            disabled: false,
            thumbnail_key: null,
        });

        return this.toExternal(training);
    }

    async retrieve(id: string) {
        const training = await this._retrieve(id);
        if (!training) {
            throw new NotFoundError('Training not found');
        }

        const cannot = await this.user.ability.cannot('detail', RolesService.object('Training', {disabled: training.disabled}));

        if (cannot) {
            throw new ForbiddenError('No permission to detail disabled training');
        }

        return this.toExternal(training);
    }

    async update(id: string, props: UpdateTrainingProps) {
        const currentTraining = await this._retrieve(id);
        if (!currentTraining || currentTraining.account !== this.account) {
            throw new NotFoundError('Training not found');
        }
        const training = await this.repository.update(currentTraining, props);

        return this.toExternal(training);
    }

    async updateTopics(id: string, topics: TrainingTopic[]) {
        const currentTraining = await this._retrieve(id);
        if (!currentTraining) {
            throw new NotFoundError('Training not found');
        }
        return await this.repository.patch(id, 'topics', topics);
    }

    async setDisabled(id: string, disabled: boolean) {
        await this.retrieve(id);

        await this.repository.patch(id, 'disabled', disabled);
    }

    async listByAccount(props?: {order: string, orderBy: string}) {
        const byAccountTrainings = await this.repository.listByAccount(this.account);
        const forAccountTrainings = await this.repository.listForAccount(this.account);

        let trainings = [...byAccountTrainings, ...forAccountTrainings];

        const cannot = await this.user.ability.cannot('list', RolesService.object('Training', {disabled: true}));

        if (cannot) {
            trainings = trainings.filter(training => !training.disabled);
        }

        const mappedTrainings = await Promise.all(trainings.map(this.toExternal.bind(this)));

        return isEmpty(props)
            ? mappedTrainings :
            _orderBy(mappedTrainings, [props.orderBy], [props.order === 'ASC' ? 'asc' : 'desc']);
    }

    async listByIds(searchIn: string[]) {
        const trainings: Training[] = [];
        const trainingIds: string[] = compact(uniq(searchIn));
        if (trainingIds.length) {
            trainings.push(...(
                await this.repository.listByIds(trainingIds)
            ));
        }

        if (this.account !== 'backoffice' && trainings.length !== trainingIds.length) {
            const alreadyListedTrainingsIds: string[] = trainings.map(training => training.id);
            const notListedTrainingIds = trainingIds.filter(id => !alreadyListedTrainingsIds.includes(id));

            const backOfficeTrainings = await this.repository.listByIds(notListedTrainingIds, 'backoffice');
            const allowedBackoffice = backOfficeTrainings.filter(training => training.allowedAccounts.includes(this.account));

            trainings.push(...allowedBackoffice);
        }

        return trainings.sort((a, b) => trainingIds.indexOf(a.id) - trainingIds.indexOf(b.id));
    }

    async listByEnableTrainingIds(trainingIds: string[], employeeId: string): Promise<ExternalTraining[]> {
        const trainings = await this.listByIds(trainingIds);
        const trainingsProgress = await this.trainingProgressRepository.listByEmployee(employeeId);

        const enabledTrainings = trainings.filter(training => !training.disabled || training.disabled && trainingsProgress.some(trainingProgress => trainingProgress.training === training.id && trainingProgress.progress > 0));

        return Promise.all(enabledTrainings.map(this.toExternal.bind(this)));
    }

    async countByAccount(accountId: string) {
        await this.accounts.retrieve(accountId);

        const total = await this.repository.countByAccount(accountId);

        return total;
    }

    async getThumbnailUploadUrl(id: string, {ContentType, ContentLength}: TrainingThumbnailUrlProps) {
        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${ContentType}`);
        }

        const Key = `trainings/${this.account}/thumbnail-${id}.${extension}`;
        const url = this.files.signedPost(Key, {ContentType, ContentLength});

        await this.repository.patch(id, 'thumbnail_key', `unconfirmed:${Key}`);

        return url;
    }

    async confirmThumbnailUpload(filePath: string) {
        const [,, fileName] = filePath.split('/');
        if (!fileName.startsWith('thumbnail-')) {
            console.log('Ignoring doc write');
            return;
        }

        const id = fileName.replace('thumbnail-', '').split('.')[0];

        const training = await this._retrieve(id);
        if (!training || training.account !== this.account) {
            throw new NotFoundError('Training not found');
        }
        if (training.thumbnail_key === `unconfirmed:${filePath}`) {
            await this.repository.patch(id, 'thumbnail_key', filePath);
        }
    }

    private async toExternal(training: Training): Promise<ExternalTraining> {
        if (!training) {
            return training;
        }

        const {thumbnail_key, ...result} = training;

        let thumbnail = null;
        if (thumbnail_key && !thumbnail_key.startsWith('unconfirmed:')) {
            thumbnail = await this.files.signedGetUrl(thumbnail_key.replace('unconfirmed:', ''), {Expires: 3600});
        }

        return {...result, thumbnail};
    }

    private async _retrieve(id: string) {
        let training = await this.repository.retrieve(id);

        if (training) {
            return training;
        }

        training = await this.repository.retrieve(id, 'backoffice');

        if (!training || !training.allowedAccounts.includes(this.account)) {
            return null;
        }

        return training;
    }

    constructor(
        private repository: TrainingsRepository,
        private files: StorageService,
        private accounts: AccountsService,
        private trainingProgressRepository: TrainingProgressesRepository,
        private account: string,
        private user: AppUser,
    ) {}
}

export type TrainingThumbnailUrlProps = Required<Pick<FileData, 'ContentType' | 'ContentLength'>>;
