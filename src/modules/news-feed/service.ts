import {BarueriConfig} from 'config';
import isEmpty from 'lodash/isEmpty';
import orderBy from 'lodash/orderBy';
import Mime from 'mime';
import {AttachmentUrlFileData, ContentAttachment} from 'modules/contents/schema';
import {BadRequestError, NotFoundError} from 'modules/errors/errors';
import {AppUser} from 'modules/users/schema';
import {VideoScopes} from 'modules/videos/schema';
import VideosService from 'modules/videos/service';
import StorageService from 'utils/storage-service';
import {v4 as uuid} from 'uuid';

import NewsFeedRepository from './repository';
import {ExternalNewsFeed, NewsFeed, NewsFeedImageUrlProps, NewsFeedProps, NewsFeedStatus, NewsFeedVideoType} from './schema';

const typeMapping = {
    'application/x-zip-compressed': ['zip'],
    'application/x-zip': ['zip'],
};

Mime.define(typeMapping, true);

export default class NewsFeedService {
    static config(cfg: BarueriConfig, user: AppUser, account: string): NewsFeedService {
        return new NewsFeedService(
            NewsFeedRepository.config(cfg, user.id, account),
            StorageService.configProtected(cfg),
            VideosService.config(cfg, user.id),
            account,
        );
    }

    private async generateAttachmentUploadUrl(newsFeedId: string, fileData: AttachmentUrlFileData) {
        const extension = Mime.getExtension(fileData.ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${fileData.ContentType}`);
        }

        const id = uuid();
        const Key = `news-feed/${this.account}/${newsFeedId}/attachment/${id}.${extension}`;
        const Metadata: ContentAttachment['metadata'] = {name: fileData.FileName, size: fileData.ContentLength.toString(), type: fileData.ContentType};

        return await this.files.signedPost(Key, {...fileData, Metadata});

    }

    async create(props: Pick<NewsFeedProps, 'text' | 'attachments_input' | 'image' | 'video_type' | 'video_url'>) {
        const newsFeed = await this.repository.create({
            account: this.account,
            text: props.text,
            video_type: props.video_type || NewsFeedVideoType.none,
            video_url: props.video_type === NewsFeedVideoType.youtubeUrl ? props.video_url : null,
            video_uploaded_id: null,
        });

        if (!isEmpty(props.attachments_input)) {
            const attachmentsUploadURLPromises = props.attachments_input.map(async (fileData: AttachmentUrlFileData) => {
                return await this.generateAttachmentUploadUrl(newsFeed.id, fileData);
            });

            newsFeed.attachments_upload_urls = await Promise.all(attachmentsUploadURLPromises);
        }

        if (props.video_type === NewsFeedVideoType.uploadedVideo) {
            newsFeed.video_upload_props = await this.createVideo();
        }

        return this.toExternal(newsFeed);
    }

    async list() {
        const feedList = await this.repository.listByAccount();
        const mappedList = await Promise.all(feedList.map(this.toExternal.bind(this)));
        return orderBy(mappedList, ['created_at'], ['desc']);
    }

    private async _retrieve(id: string) {
        const newsFeed = await this.repository.retrieve(id);
        if (!newsFeed || newsFeed.status === NewsFeedStatus.inactive) {
            throw new NotFoundError();
        }

        return newsFeed as NewsFeed;
    }

    async retrieve(id: string) {
        const newsFeed = await this._retrieve(id);
        return this.toExternal(newsFeed as NewsFeed);
    }

    async getImageUploadUrl(id: string, {ContentType, ContentLength}: NewsFeedImageUrlProps) {
        await this._retrieve(id);

        const extension = Mime.getExtension(ContentType);
        if (!extension) {
            throw new BadRequestError(`Unknown extension for ContentType: ${ContentType}`);
        }

        const Key = `news-feed/${this.account}/${id}/image.${extension}`;
        const url = await this.files.signedPost(Key, {ContentType, ContentLength});

        await this.repository.patch(id, 'image_key', `unconfirmed:${Key}`);

        return url;
    }

    async getAttachmentUploadUrl(id: string, fileData: AttachmentUrlFileData) {
        const newsFeed = await this._retrieve(id);
        if (newsFeed.attachment_keys?.length === 5) {
            throw new BadRequestError('max_attachment_limit_reached');
        }

        return await this.generateAttachmentUploadUrl(newsFeed.id, fileData);
    }

    async confirmImageUpload(id: string, filePath: string) {
        const newsFeed = await this._retrieve(id);
        if (newsFeed.image_key === `unconfirmed:${filePath}`) {
            await this.repository.patch(id, 'image_key', filePath);
        }
    }

    async confirmAttachmentUpload(id: string, filePath: string) {
        const newsFeed = await this._retrieve(id);
        const keys = isEmpty(newsFeed.attachment_keys) ? [] : [...newsFeed.attachment_keys];

        if (keys.length === 5) {
            throw new BadRequestError('max_attachment_limit_reached');
        }

        const [, attachmentId] = filePath.split('/attachment/');
        keys.push(attachmentId);
        await this.repository.patch(id, 'attachment_keys', keys);
    }

    async createVideo() {
        const video = await this.videos.create({
            scope: VideoScopes.NewsFeed,
        });

        return video;
    }

    private async toExternal(newsFeed: NewsFeed): Promise<ExternalNewsFeed> {
        if (!newsFeed) {
            return newsFeed;
        }

        const {image_key, attachment_keys = [], ...result} = newsFeed;

        let image = null;
        if (image_key && !image_key.startsWith('unconfirmed:')) {
            image = await this.files.signedGetUrl(image_key.replace('unconfirmed:', ''), {Expires: 3600}, true);
        }

        const attachments = await Promise.all(attachment_keys.map(async (attachmentId) => {
            const filePath = `news-feed/${this.account}/${newsFeed.id}/attachment/${attachmentId}`;
            const url = await this.files.signedGetUrl(filePath, {Expires: 3600}, true);
            const metadata = await this.files.metadata(filePath);
            return {url, metadata};
        }));

        if (result.video_type === NewsFeedVideoType.uploadedVideo && result.video_uploaded_id) {
            const video = await this.videos.retrieve(result.video_uploaded_id, VideoScopes.NewsFeed);
            result.video_url = video.url;
        }

        return {...result, attachments, attachment_keys, image};
    }

    async update(id: string, props: Pick<NewsFeedProps, 'text' | 'image'>) {
        const currentNewsFeed = await this._retrieve(id);
        const {
            image,
            ...patchNewsFeed
        } = props;

        const updatedNewsFeed = await this.repository.update(currentNewsFeed, {
            image_key: image ? currentNewsFeed.image_key : null,
            ...patchNewsFeed,
        });
        return this.toExternal(updatedNewsFeed);
    }

    async updateVideo(id: string, props: Pick<NewsFeedProps, 'video_type' | 'video_url' | 'video_uploaded_id'>) {
        const currentNewsFeed = await this._retrieve(id);

        const updatedNewsFeed = await this.repository.update(currentNewsFeed, {
            video_type: props.video_type || NewsFeedVideoType.none,
            video_url: props.video_type === NewsFeedVideoType.youtubeUrl ? props.video_url : null,
            video_uploaded_id: props.video_type === NewsFeedVideoType.uploadedVideo ? props.video_uploaded_id : null,
        });

        return this.toExternal(updatedNewsFeed);
    }

    async removeAttachment(id: string, attachmentId: string) {
        const currentNewsFeed = await this._retrieve(id);
        const attachment_keys = currentNewsFeed.attachment_keys.filter(key => key !== attachmentId);
        await this.repository.patch(id, 'attachment_keys', attachment_keys);

        const filePath = `news-feed/${this.account}/${currentNewsFeed.id}/attachment/${attachmentId}`;
        await this.files.deleteObject(filePath);

        return this.toExternal({...currentNewsFeed, attachment_keys});
    }

    async delete(id: string) {
        const current = await this._retrieve(id);
        await this.repository.delete(current);
    }

    constructor(
        private repository: NewsFeedRepository,
        private files: StorageService,
        private videos: VideosService,
        private account: string,
    ) { }
}
