import {BarueriConfig} from 'config';
import {NotFoundError} from 'modules/errors/errors';
import {AppUser} from 'modules/users/schema';

import NewsFeedRepository from '../repository';
import FeedsCommentsRepository from './repository';
import {NewsFeedCommentProps} from './schema';

export default class FeedCommentService {
    static config(cfg: BarueriConfig, user: AppUser, account: string): FeedCommentService {
        return new FeedCommentService(
            FeedsCommentsRepository.config(cfg, user.id, account),
            NewsFeedRepository.config(cfg, user.id, account),
            account,
        );
    }

    async create(props: Pick<NewsFeedCommentProps, 'text'>, newsFeedId: string) {
        const result = await this.repository.create(props, newsFeedId);

        await this.updateCommentsCount(newsFeedId);

        return result;
    }

    async listCommentsByPostWithPagination(
        feedId: string,
        listProps: { pageSize: number, next?: string },
    ) {
        const commentsPaginated = await this.repository.listCommentsByPostWithPagination(
            this.account,
            feedId,
            listProps,
        );

        return commentsPaginated;

    }

    async retrieve(newsFeedId: string, feedCommentId: string) {
        const newsFeedComment = await this.repository.retrieve(newsFeedId, feedCommentId);

        if (!newsFeedComment) {
            throw new NotFoundError('Comment not found');
        }

        return newsFeedComment;
    }

    async delete(newsFeedId: string, feedCommentId: string) {
        await this.repository.delete(newsFeedId, feedCommentId);
        await this.updateCommentsCount(newsFeedId);
    }

    private async updateCommentsCount(newsFeedId: string) {
        const countCommentsByPost = await this.repository.countCommentsByPost(this.account, newsFeedId);

        const updatedItem = await this.newsFeedRepository.patch(newsFeedId, 'comments', countCommentsByPost);

        return updatedItem;

    }
    constructor(
        private repository: FeedsCommentsRepository,
        private newsFeedRepository: NewsFeedRepository,
        private account: string,
    ) { }
}
