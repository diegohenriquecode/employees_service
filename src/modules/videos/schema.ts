import Joi from 'joi';

export type VideoProps = {
    disabled?: boolean,
    title?: string,
    tags?: string[],
    thumbnail?: string,
    status?: VideoStatus,
    scope: VideoScopes,
    roles?: string[]
};

export type Video = VideoProps & {
    id: string,
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type VideoDTO = Video & {
    tokyo_video_id: string
    url: string
};

export type UpdateVideoProps = Pick<VideoProps, 'title' | 'tags' | 'thumbnail' | 'roles'>;

export enum WebhookEntryStatus {
    Converting = 'converting',
    ErrorConverting = 'error_converting',
    Ready = 'ready',
}

export enum VideoStatus {
    Uploading = 'uploading',
    Converting = 'converting',
    ErrorConverting = 'error_converting',
    Uploaded = 'uploaded',
    Orphan = 'Orphan'
}

export enum VideoScopes {
    NewsFeed = 'newsFeed',
    Training = 'training',
    Tutorial = 'tutorial',
}

const captionLanguages = [
    'Arabic',
    'Cantonese',
    'Catalan',
    'Chinese',
    'Danish',
    'Dutch',
    'English',
    'Finnish',
    'French',
    'German',
    'Greek',
    'Hebrew',
    'Hindi',
    'Hungarian',
    'Icelandic',
    'Indonesian',
    'Irish',
    'Italian',
    'Japanese',
    'Korean',
    'Malayalam',
    'Mandarin Chinese',
    'Norwegian',
    'Polish',
    'Portuguese',
    'Romanian',
    'Russian',
    'Spanish',
    'Swedish',
    'Taiwanese Mandarin',
    'Tamil',
    'Thai',
    'Turkish',
    'Ukrainian',
    'Urdu',
    'Vietnamese',
    'Welsh',
    'Zulu',
];

export const UploadCaptionSchema = Joi.object({
    language: Joi.string().valid(...captionLanguages),
});
