import {SchemaMap} from 'joi';
import Joi from 'utils/joi';
import {FileData} from 'utils/storage-service';

export enum ContentType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
  Attachments = 'attachments'
}

export const ContentSchemaMap: SchemaMap<Content, true> = {
    id: Joi.string(),

    type: Joi.string().valid(...Object.values(ContentType)),
    value: Joi.when('type', {
        is: ContentType.Attachments,
        then: Joi.object().pattern(
            Joi.string(),
            Joi.object({
                key: Joi.string(),
                metadata: Joi.object(),
            }),
        ),
        otherwise: Joi.string(),
    }) as any,

    account: Joi.string(),

    created_at: Joi.string().isoDate(),
    created_by: Joi.string(),
    updated_at: Joi.string().isoDate(),
    updated_by: Joi.string(),
};

export type ContentProps = ({
  type: ContentType.Attachments
  value: Record<string, ContentAttachment>
} | {
  type: Exclude<ContentType, ContentType.Attachments>;
  value: string;
}) & {
  account: string;
};

export type ContentAttachment = {
  key: string,
  metadata?: {
    name: string,
    size: string,
    type: string
  }
};
type ExternalContentAttachment = Omit<ContentAttachment, 'key'> & {id: string, url: string | null};

export type Content = WithDefaultProps<ContentProps>;
export type CreateContentProps = {
  type: ContentType.Attachments
} | {
  type: Exclude<ContentType, ContentType.Attachments>;
  value: string;
};
export type UpdateContentProps = Partial<{
  type: Exclude<ContentType, ContentType.Attachments>;
  value: string;
}>;
export type ExternalContent = Omit<Content, 'value'> & { value: string | ExternalContentAttachment[] };

export type AttachmentUrlFileData = Required<Pick<FileData, 'ContentType' | 'ContentDisposition' | 'ContentLength'>> & {FileName: string};

type WithDefaultProps<T> = T & {
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
};
