import {AxiosInstance} from 'axios';
import FormData from 'form-data';
import {ConflictError, NotFoundError} from 'modules/errors/errors';

import {BarueriConfig} from '../../config';
import axios from '../../utils/axios';

export default class TokyoGateway {
    static config(cfg: BarueriConfig) {
        return new TokyoGateway(
            axios({
                debug: cfg.debug,
                baseURL: cfg.tokyo.osakaUrl,
                headers: {'Content-Type': 'application/json', 'x-api-key': cfg.tokyo.apiKey},
            }),
            axios({
                debug: cfg.debug,
                baseURL: cfg.tokyo.yokohamaUrl,
                headers: {'Content-Type': 'application/json', 'x-api-key': cfg.tokyo.apiKey},
            }),
        );
    }

    async uploadComponent(name: string, thumbnailUrl: string | undefined, userId: string) {
        const {data} = await this.osaka.post('upload/component/v2', {
            name,
            thumbnailUrl,
            conversionProfile: 'FROM_UPLOAD',
            userId,
        });

        return data as UploadComponent;
    }

    async playUrl(id: string, userId: string) {
        const {data} = await this.yokohama.post('videos/play', {
            userId,
            previewAllowed: true,
            videos: [{id}],
        });
        return data[id];
    }

    async uploadCaption(userId: string, videoId: string, language: string, captionFile: Express.Multer.File) {
        const form = new FormData();
        form.append('userId', userId);
        form.append('language', language);
        form.append('videoId', videoId);
        form.append('file', captionFile.buffer, captionFile.originalname);

        try {
            const response = await this.osaka.post('upload/captions/upload', form, {headers: {'Content-Type': 'multipart/form-data'}});
            return response.data;
        } catch (error: unknown) {
            if (error.response.status === 404) {
                throw new NotFoundError('Video not found');
            } else if (error.response.status === 409) {
                throw new ConflictError('This language already have a caption');
            }

            throw error;
        }
    }

    async updateCaption(userId: string, videoId: string, captionId: string, captionFile: Express.Multer.File) {
        const form = new FormData();
        form.append('userId', userId);
        form.append('videoId', videoId);
        form.append('file', captionFile.buffer, captionFile.originalname);

        try {
            const response = await this.osaka.patch(`upload/captions/upload/${captionId}`, form, {headers: {'Content-Type': 'multipart/form-data'}});
            return response.data;
        } catch (error: unknown) {
            if (error.response.status === 404) {
                throw new NotFoundError('Video not found');
            } else if (error.response.status === 409) {
                throw new ConflictError('This language already have a caption');
            }

            throw error;
        }
    }

    async listCaptions(userId: string, videoId: string) {
        try {
            const result = await this.yokohama.get('videos/captions', {
                params: {
                    videoId,
                    userId,
                },
            });

            return result.data.captions;
        } catch (error: unknown) {
            if (error.response.status === 404) {
                return {captions: []};
            }

            throw error;
        }
    }

    async removeCaption(userId: string, videoId: string, captionId: string) {
        try {
            const response = await this.yokohama.delete(`videos/captions/${captionId}`, {
                params: {
                    videoId,
                    userId,
                },
            });

            return response.data;
        } catch (error: unknown) {
            if (error.response.status === 404) {
                throw new NotFoundError('Video not found');
            }

            throw error;
        }
    }

    constructor(
        private osaka: AxiosInstance,
        private yokohama: AxiosInstance,
    ) {}
}

interface UploadComponent {
    id: string;
    ks: string;
    status: string;
    upload_token_id: string;
    url: string;
}
