import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {DocumentClient} from 'aws-sdk/lib/dynamodb/document_client';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import DynamoClient from 'utils/dynamo-client';
import {v4 as uuidV4} from 'uuid';

import {NewsFeedComment, NewsFeedCommentProps} from './schema';

export default class NewsFeedCommentRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new NewsFeedCommentRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.newsFeedCommentsTables,
            cfg.newsFeedCommentsByDate,
            user,
            account,
        );
    }

    async create(props: Pick<NewsFeedCommentProps, 'text'>, newsFeedId: string) {
        const Item: NewsFeedComment = {
            id: uuidV4(),
            ...props,
            account: this.account,
            newsFeedId,
            employee: this.user,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: DbMapper.to(Item),
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        return Item;
    }

    async retrieve(id: string, newsFeedId: string) {
        const Key = this.getKey(id, newsFeedId);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        const mappedItem = DbMapper.from(Item);

        return mappedItem;
    }

    async delete(newsFeedId: string, feedCommentId: string) {
        const Key = this.getKey(newsFeedId, feedCommentId);
        const params = {
            TableName: this.table,
            Key,
        };

        await this.documents.delete(params);
    }

    async countCommentsByPost(accountId: string, postId: string) {
        const params = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_PostCommentId, :prefix)',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#_PostCommentId': '_PostCommentId',
            },
            ExpressionAttributeValues: {
                ':account': accountId,
                ':prefix': `${postId}`,
            },
            Select: 'COUNT',
        };

        const {Count} = await this.documents.query(params);

        return Count;

    }

    async listCommentsByPostWithPagination(
        accountId: string,
        newsFeedId: string,
        listProps: { pageSize: number, next?: string },
    ) {

        const params: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            IndexName: this.commentIndex,
            KeyConditionExpression: '#account = :account AND begins_with(#_PostIdDate, :prefix)',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#_PostIdDate': '_PostIdDate',
            },
            ExpressionAttributeValues: {
                ':account': accountId,
                ':prefix': newsFeedId,
            },
            Limit: listProps.pageSize,
            ScanIndexForward: false,
            ExclusiveStartKey: listProps.next && JSON.parse(listProps.next),
        };

        const {Items, LastEvaluatedKey} = await this.documents.query(params);

        const mappedItems = Items.map(item => DbMapper.from(item));

        return {
            items: mappedItems,
            next: LastEvaluatedKey ? JSON.stringify(LastEvaluatedKey) : null,
        };
    }

    private getKey(id: string, newsFeedId: string) {
        return {
            account: this.account,
            [RangeKey]: `${id}#${newsFeedId}`,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private commentIndex: string,
        private user: string,
        private account: string,
    ) {}
}

class DbMapper {
    static to(Item: NewsFeedComment) {
        if (!Item) {
            return Item;
        }

        return {
            ...Item,
            [RangeKey]: `${Item.newsFeedId}#${Item.id}`,
            [RangeKeyIdDate]: `${Item.newsFeedId}#${Item.created_at}`,
        };
    }

    static from(Item: InRepositoryNewsFeedComment) {
        if (!Item) {
            return Item;
        }
        const {[RangeKey]: _, [RangeKeyIdDate]: __, ...result} = Item;

        return result;
    }
}

type InRepositoryNewsFeedComment = NewsFeedComment & {
    [RangeKey]: string
    [RangeKeyIdDate]: string
};

const RangeKey = '_PostCommentId';
const RangeKeyIdDate = '_PostIdDate';
