import {ForbiddenError} from 'modules/errors/errors';
import {VideoScopes, VideoStatus} from 'modules/videos/schema';
import VideosService from 'modules/videos/service';

import {BarueriConfig} from '../../config';
import {FileData} from '../../utils/storage-service';
import {Tutorial, TutorialProps, UpdateTutorialProps} from './schema';

export default class TutorialsService {
    static config(cfg: BarueriConfig, userId: string) {
        return new TutorialsService(
            VideosService.config(cfg, userId),
            userId,
        );
    }

    async create(data: TutorialProps) {
        return await this.videos.create({
            ...data,
            scope: VideoScopes.Tutorial,
        });
    }

    async updateTutorialVideo(tutorialId: string) {
        return await this.videos.updateVideo(tutorialId, VideoScopes.Tutorial);
    }

    async list(options: ListOptions = {}) {
        let result = await this.videos.list(options);

        if (options.roles?.length) {
            result = result
                .filter(r => r.roles && this.checkRoles(r.roles, options.roles as string[]));
        }

        return result.filter(r => r.scope === VideoScopes.Tutorial).map(out);
    }

    async retrieve(id: string, roles?: string[]) {
        const tutorial = await this.videos.retrieve(id, VideoScopes.Tutorial);

        if (roles?.length && !this.checkRoles(tutorial.roles || [], roles)) {
            throw new ForbiddenError();
        }

        return out(tutorial as Tutorial);
    }

    async update(id: string, props: UpdateTutorialProps) {
        return await this.videos.update(id, VideoScopes.Tutorial, props);
    }

    async setDisabled(id: string, val: boolean) {
        return await this.videos.setDisabled(id, VideoScopes.Tutorial, val);
    }

    async thumbnailUrl({ContentType, ContentLength}: Required<Pick<FileData, 'ContentType' | 'ContentLength'>>) {
        return await this.videos.thumbnailUrl({ContentType, ContentLength});
    }

    async uploadCaption(videoId: string, language: string, file: Express.Multer.File) {
        return await this.videos.uploadCaption(videoId, VideoScopes.Tutorial, language, file);
    }

    async updateCaption(videoId: string, captionId: string, file: Express.Multer.File) {
        return await this.videos.updateCaption(videoId, VideoScopes.Tutorial, captionId, file);
    }

    async listCaptions(videoId: string) {
        return await this.videos.listCaptions(videoId, VideoScopes.Tutorial);
    }

    async removeCaption(videoId: string, captionId: string) {
        return await this.videos.removeCaption(videoId, VideoScopes.Tutorial, captionId);
    }

    private checkRoles(tutorialRoles: string[], filterRoles: string[]) {
        return filterRoles.some(role => tutorialRoles.includes(role));
    }

    constructor(
        private videos: VideosService,
        private user: string,
    ) {}
}

interface ListOptions {
    disabled?: boolean
    status?: VideoStatus
    roles?: string[]
}

function out(tutorial: Tutorial) {
    return {...tutorial, roles: tutorial.roles || []};
}
