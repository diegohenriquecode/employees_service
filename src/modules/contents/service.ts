import cuid from '@paralleldrive/cuid2';
import {BarueriConfig} from 'config';
import Mime from 'mime';
import {BadRequestError, NotFoundError} from 'modules/errors/errors';
import {VideoScopes} from 'modules/videos/schema';
import VideosService from 'modules/videos/service';
import StorageService from 'utils/storage-service';

import ContentsRepository from './repository';
import {AttachmentUrlFileData, Content, ContentAttachment, ContentProps, ContentType, CreateContentProps, ExternalContent, UpdateContentProps} from './schema';

export default class ContentsService {
    static config(cfg: BarueriConfig, userId: string, accountId: string): ContentsService {
        return new ContentsService(
            ContentsRepository.config(cfg, userId, accountId),
            VideosService.config(cfg, userId),
            StorageService.configProtected(cfg),
            accountId,
        );
    }

    async create(props: CreateContentProps) {
        let value = {};
        if (props.type !== ContentType.Attachments) {
            value = props.value;
        }

        const created = await this.repository.create({...props, value});
        return await this.toExternal(created);
    }

    async retrieve(id: string) {
        const content = await this._retrieve(id);

        if (content.type === ContentType.Video) {
            const video = await this.videos.retrieve(content.value, VideoScopes.Training);
            return {...content, status: video.status, value: video.url};
        }

        return await this.toExternal(content);
    }

    async update(id: string, props: UpdateContentProps) {
        const current = await this._retrieve(id);

        const updated = await this.repository.update(current, props);
        return await this.toExternal(updated);
    }

    async attachmentUrl(id: string, {FileName, ...fileData}: AttachmentUrlFileData) {
        const content = await this._retrieve(id);
        if (content.type !== ContentType.Attachments) {
            throw new BadRequestError(`Cannot upload attachment for types different than: ${ContentType.Attachments}`);
        }

        const extension = Mime.getExtension(fileData.ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${fileData.ContentType}`);
        }

        const attachmentId = createId();
        const Key = `contents/${this.accountId}/${content.id}/${attachmentId}.${extension}`;

        const Metadata: ContentAttachment['metadata'] = {name: FileName, size: fileData.ContentLength.toString(), type: fileData.ContentType};
        const url = this.files.signedPost(Key, {...fileData, Metadata});

        await this.repository.patch(id, `value.${attachmentId}` as keyof ContentProps, {
            key: `unconfirmed:${Key}`,
            metadata: Metadata,
        });

        return url;
    }

    async confirmAttachmentUpload(key: string) {
        const [, , contentId, filename] = key.split('/');
        const [attachmentId, extension] = filename.split('.');

        const contentType = Mime.getType(extension);
        if (!contentType) {
            throw new BadRequestError(`Unknown ContentType for extension: ${extension}`);
        }

        const {value, type} = await this._retrieve(contentId);
        if (type !== ContentType.Attachments) {
            throw new BadRequestError(`Cannot confirm upload attachment for types different than: ${ContentType.Attachments}`);
        }

        if (value[attachmentId] && value[attachmentId].key === `unconfirmed:${key}`) {
            await this.repository.patch(
                contentId,
                `value.${attachmentId}` as keyof ContentProps,
                {...value[attachmentId], key},
            );
        }
    }

    async deleteAttachment(contentId: string, attachmentId: string) {
        const content = await this._retrieve(contentId);
        if (content.type !== ContentType.Attachments) {
            throw new BadRequestError(`Cannot delete attachment for types different than: ${ContentType.Attachments}`);
        }

        const value = {...content.value};
        await this.files.deleteObject(value[attachmentId].key);

        delete value[attachmentId];

        await this.repository.update(content, {value});
    }

    async uploadCaption(contentId: string, language: string, file: Express.Multer.File) {
        const videoId = await this._retrieveVideoId(contentId);
        return await this.videos.uploadCaption(videoId, VideoScopes.Training, language, file);
    }

    async updateCaption(contentId: string, captionId: string, file: Express.Multer.File) {
        const videoId = await this._retrieveVideoId(contentId);
        return await this.videos.updateCaption(videoId, VideoScopes.Training, captionId, file);
    }

    async listCaptions(contentId: string) {
        const videoId = await this._retrieveVideoId(contentId);
        return await this.videos.listCaptions(videoId, VideoScopes.Training);
    }

    async removeCaption(contentId: string, captionId: string) {
        const videoId = await this._retrieveVideoId(contentId);
        return await this.videos.removeCaption(videoId, VideoScopes.Training, captionId);
    }

    private async _retrieve(id: string) {
        const content = await this.repository.retrieve(id) || await this.repository.retrieve(id, 'backoffice');

        if (!content) {
            throw new NotFoundError('Content not found');
        }

        return content;
    }

    private async _retrieveVideoId(contentId: string) {
        const content = await this._retrieve(contentId);

        if (content.type !== ContentType.Video) {
            throw new NotFoundError('Content is not a video');
        }

        return content.value;
    }

    async createVideo() {
        const video = await this.videos.create({
            scope: VideoScopes.Training,
        });

        return video;
    }

    private async toExternal(content: Content): Promise<ExternalContent> {
        if (!content) {
            return content;
        }

        let value = content.value as ExternalContent['value'];
        if (content.type === ContentType.Attachments) {
            value = await Promise.all(
                Object.entries(content.value || {})
                    .map(async ([id, {key, ...attachment}]) => ({
                        ...attachment,
                        id,
                        url: key && !key.startsWith('unconfirmed:')
                            ? await this.files.signedGetUrl(key.replace('unconfirmed:', ''), {Expires: 3600})
                            : null,
                    })),
            );
        }

        return {...content, value};
    }

    constructor(
        private repository: ContentsRepository,
        private videos: VideosService,
        private files: StorageService,
        private accountId: string,
    ) {}
}

const createId = cuid.init({length: 12});
