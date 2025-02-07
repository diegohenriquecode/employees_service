import {init} from '@paralleldrive/cuid2';
import Mime from 'mime';
import {v4 as uuid} from 'uuid';

import {BarueriConfig} from '../../config';
import StorageService, {FileData} from '../../utils/storage-service';
import {BadRequestError, NotFoundError} from '../errors/errors';
import VideosRepository from './repository';
import {UpdateVideoProps, VideoDTO, VideoProps, VideoScopes, VideoStatus, WebhookEntryStatus} from './schema';
import TokyoGateway from './tokyo-gateway';

export default class VideosService {
    static config(cfg: BarueriConfig, userId: string) {
        return new VideosService(
            VideosRepository.config(cfg, userId),
            TokyoGateway.config(cfg),
            StorageService.configPublic(cfg),
            userId,
            cfg.mailAssetsUrl,
        );
    }

    async create(data: VideoProps) {
        const id = uuid();

        const thumbnail = data.thumbnail || this.mailAssetsUrl + '/default-logo.png';

        const {id: tokyo_video_id, url, ks, upload_token_id} = await this.tokyo
            .uploadComponent(`barueri-${data.scope}-${id}`, thumbnail, this.user);

        await this.repository.create({
            tags: [],
            title: '',
            disabled: false,
            thumbnail,
            ...data,
            id,
            tokyo_video_id,
            status: VideoStatus.Uploading,
        });

        return {id, ks, upload_token_id, url};
    }

    async updateVideo(videoId: string, scope: VideoScopes) {
        const video = await this._retrieve(videoId, scope);

        const newId = uuid();
        await this.repository.create({
            tags: [],
            title: '',
            disabled: false,
            thumbnail: this.mailAssetsUrl + '/default-logo.png',
            ...video,
            id: newId,
            status: VideoStatus.Orphan,
            scope,
        });

        const {id: tokyo_video_id, url, ks, upload_token_id} = await this.tokyo
            .uploadComponent(`barueri-${scope}-${video.id}`, video.thumbnail, this.user);

        await this.repository.update(video, {
            status: VideoStatus.Uploading,
            tokyo_video_id,
        });

        return {id: video.id, ks, upload_token_id, url};
    }

    async list(options: ListOptions = {}) {
        let result = await this.repository
            .list();

        if ('disabled' in options) {
            result = result
                .filter(r => r.disabled === options.disabled);
        }

        if ('status' in options) {
            result = result
                .filter(r => r.status === options.status);
        }

        result = result
            .filter(r => r.status !== VideoStatus.Orphan);

        return result
            .map(({tokyo_video_id, ...rest}) => rest);
    }

    async retrieve(id: string, scope: VideoScopes) {
        const {tokyo_video_id, ...result} = await this
            ._retrieve(id, scope);

        if (result.status === VideoStatus.Uploaded) {
            result.url = await this.tokyo
                .playUrl(tokyo_video_id, this.user);
        }

        return result;
    }

    async update(id: string, scope: VideoScopes, props: UpdateVideoProps) {
        const current = await this._retrieve(id, scope);

        return await this.repository.update(current, props);
    }

    private async _retrieve(id: string, scope: VideoScopes): Promise<VideoDTO> {
        const result = await this.repository
            .retrieve(id);
        if (!result) {
            throw new NotFoundError();
        }
        if (result.scope && result.scope !== scope) {
            throw new NotFoundError('Not found a video with this scope');
        }

        return result;
    }

    async setDisabled(id: string, scope: VideoScopes, val: boolean) {
        await this._retrieve(id, scope);
        await this.repository
            .patch(id, 'disabled', val);
    }

    async updateStatus(tokyo_video_id: string, status: WebhookEntryStatus) {
        const video = await this.repository
            .findByVideoId(tokyo_video_id);
        if (!video) {
            throw new NotFoundError(`Video ${tokyo_video_id} not found`);
        }

        if (![VideoStatus.Orphan, VideoStatus.Uploaded].includes(video.status)) {
            await this.repository
                .patch(video.id, 'status', VideoStatusByWebhookStatus[status]);
        } else {
            console.warn(`Video with tokyo_video_id ${tokyo_video_id} not updated because it's orphan or already uploaded`);
        }
    }

    async thumbnailUrl({ContentType, ContentLength}: Required<Pick<FileData, 'ContentType' | 'ContentLength'>>) {
        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${ContentType}`);
        }

        const Key = `tutorials/thumbnail-${createId()}.${extension}`;

        const post = await this.files.signedPost(Key, {ContentType, ContentLength});
        const get = this.files.url(Key);
        return {post, get};
    }

    async uploadCaption(videoId: string, scope: VideoScopes, language: string, file: Express.Multer.File) {
        const video = await this._retrieve(videoId, scope);

        return await this.tokyo.uploadCaption(this.user, video.tokyo_video_id, language, file);
    }

    async updateCaption(videoId: string, scope: VideoScopes, captionId: string, file: Express.Multer.File) {
        const video = await this._retrieve(videoId, scope);

        return await this.tokyo.updateCaption(this.user, video.tokyo_video_id, captionId, file);
    }

    async listCaptions(videoId: string, scope: VideoScopes) {
        const video = await this._retrieve(videoId, scope);

        return await this.tokyo.listCaptions(this.user, video.tokyo_video_id);
    }

    async removeCaption(videoId: string, scope: VideoScopes, captionId: string) {
        const video = await this._retrieve(videoId, scope);

        return await this.tokyo.removeCaption(this.user, video.tokyo_video_id, captionId);
    }

    constructor(
        private repository: VideosRepository,
        private tokyo: TokyoGateway,
        private files: StorageService,
        private user: string,
        private mailAssetsUrl: string,
    ) {}
}

const VideoStatusByWebhookStatus = {
    [WebhookEntryStatus.Converting]: VideoStatus.Converting,
    [WebhookEntryStatus.ErrorConverting]: VideoStatus.ErrorConverting,
    [WebhookEntryStatus.Ready]: VideoStatus.Uploaded,
};

interface ListOptions {
    disabled?: boolean
    status?: VideoStatus
}

const createId = init({length: 6});
