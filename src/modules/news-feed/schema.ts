import {AttachmentUrlFileData} from 'modules/contents/schema';
import {FileData} from 'utils/storage-service';

import Joi from '../../utils/joi';
import {UserSchema} from '../users/schema';

export enum NewsFeedStatus {
    active = 'active',
    inactive = 'inactive',
}

export enum NewsFeedVideoType {
    none = 'none',
    youtubeUrl = 'youtubeUrl',
    uploadedVideo = 'uploadedVideo',
}

export const AttachmentPropsSchema = Joi.object({
    FileName: Joi.string(),
    ContentType: Joi.string().pattern(/^(application\/.+|text\/csv)$/),
    ContentLength: Joi.number().integer().min(1).max(3 * 1024 * 1024),
});

export type NewsFeedProps = {
    text?: string
    account: string
    status: NewsFeedStatus
    comments: number | null,
    image_key: string | null
    image?: string | null
    attachments: Record<string, unknown>[] | []
    attachments_input: AttachmentUrlFileData[] | []
    attachment_keys: string[] | []
    attachments_upload_urls?: Record<string, unknown>[] | null
    video_type?: NewsFeedVideoType | null
    video_url?: string | null
    video_upload_props?: Record<string, unknown> | null
    video_uploaded_id?: string | null
};

export type NewsFeed = NewsFeedProps & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export const NewsFeedSchema = Joi.object<NewsFeed>().keys({
    id: Joi.string(),

    image: Joi.string().optional().allow(null),
    text: Joi.string().trim().min(1).max(8192).optional().allow(null),
    attachments_input: Joi.array().optional().items(AttachmentPropsSchema).max(5).default([]),

    video_type: Joi.string().valid(...Object.values(NewsFeedVideoType)).optional().allow(null),
    video_url: Joi.when('type', {
        is: NewsFeedVideoType.youtubeUrl,
        then: Joi.string().required(),
        otherwise: Joi.string().optional().allow(null),
    }),
    video_uploaded_id: Joi.when('type', {
        is: NewsFeedVideoType.uploadedVideo,
        then: Joi.string().required(),
        otherwise: Joi.string().optional().allow(null),
    }),

    account: UserSchema.extract('account'),
    status: Joi.valid(...Object.values(NewsFeedStatus)),

    comments: Joi.number().optional().allow(null),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
});

export type ListProps = {
    to: string
    from: string
    page: number
    pageSize: number
    order?: 'ASC' | 'DESC'
    orderBy?: string
    active: boolean
};

export type NewsFeedImageUrlProps = Required<Pick<FileData, 'ContentType' | 'ContentLength'>>;
export type ExternalNewsFeed = Omit<NewsFeed, 'image_key'> & {image: string | null};
