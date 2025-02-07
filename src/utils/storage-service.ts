import {GetObjectCommand, GetObjectCommandInput, NoSuchKey, PutObjectCommandInput, S3} from '@aws-sdk/client-s3';
import {createPresignedPost, PresignedPostOptions} from '@aws-sdk/s3-presigned-post';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {BarueriConfig} from 'config';
import {NotFoundError} from 'modules/errors/errors';

const s3Client = (cfg: BarueriConfig) => new S3(cfg.local ? {
    forcePathStyle: true,
    endpoint: 'http://localhost:4569',
} : {});

export default class StorageService {
    static configProtected(cfg: BarueriConfig) {
        return new StorageService(
            s3Client(cfg),
            cfg.protectedBucketName,
            '',
        );
    }

    static configPublic(cfg: BarueriConfig) {
        return new StorageService(
            s3Client(cfg),
            cfg.publicBucketName,
            cfg.publicAssetsUrl,
        );
    }

    async signedGetUrl(filePath: string, {Expires = 300} = {}, isAttachment = false) {
        const options: GetObjectCommandInput = {
            Bucket: this.bucket,
            Key: filePath,
        };

        if (isAttachment) {
            options.ResponseContentDisposition = 'attachment;';
        }
        const command = new GetObjectCommand(options);

        return getSignedUrl(this.s3, command, {expiresIn: Expires});
    }

    url(key: string) {
        return `${this.baseUrl}/${key}`;
    }

    async signedPost(filePath: string, {ContentType = '', Metadata = {}, ContentDisposition = '', ContentLength = 0, Expires = 300}: FileData = {}) {
        const Conditions: PresignedPostOptions['Conditions'] = [
            {'key': filePath},
            ...Object.entries(Metadata)
                .map(([key, value]) => ({[`x-amz-meta-${key}`]: value})),
        ];

        const Fields = Object.fromEntries(Conditions.flatMap(item => (Object.entries(item))));

        Conditions.push({'Content-Type': ContentType});

        if (ContentDisposition) {
            Conditions.push({'Content-Disposition': ContentDisposition});
        }

        if (ContentLength) {
            Conditions.push(['content-length-range', ContentLength, ContentLength]);
        }

        const {url, fields} = await createPresignedPost(this.s3, {
            Bucket: this.bucket,
            Key: filePath,
            Conditions,
            Fields,
            Expires,
        });

        return {url, fields};
    }

    async deleteObject(filePath: string) {
        await this.s3.deleteObject({
            Bucket: this.bucket,
            Key: filePath,
        });
    }

    async metadata(filePath: string, fullResponse?: boolean) {
        const response = await this.s3.headObject({
            Bucket: this.bucket,
            Key: filePath,
        });
        return fullResponse ? response : response.Metadata;
    }

    async getObject(filePath: string) {
        const s3Response = await this.s3.getObject({
            Bucket: this.bucket,
            Key: filePath,
        });

        return streamToBuffer(s3Response.Body);
    }

    async putAttachment(filePath: string, Body: PutObjectCommandInput['Body'], name?: string) {
        await this.s3.putObject({
            Bucket: this.bucket,
            Key: filePath,
            Body,
            ContentType: 'application/octet-stream',
            ContentDisposition: name ? `attachment; filename="${name}"` : 'attachment',
        });
    }

    async readJsonFile(fileName: string) {
        try {
            const json = await this.s3.getObject({
                Bucket: this.bucket,
                Key: fileName,
                ResponseContentType: 'application/json',
            });

            return await json.Body?.transformToString('utf-8');
        } catch (e) {
            if (e instanceof NoSuchKey) {
                throw new NotFoundError('There isnt a template for demo account');
            }
        }
    }

    constructor(
        private s3: S3,
        private bucket: string,
        private baseUrl: string,
    ) {}
}

export type FileData = {
    ContentType?: string;
    Metadata?: object;
    ContentDisposition?: string;
    ContentLength?: number;
    Expires?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
