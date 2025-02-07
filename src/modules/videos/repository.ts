import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import moment from 'moment/moment';
import {v4 as uuidV4} from 'uuid';

import {BarueriConfig} from '../../config';
import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {Video, VideoDTO} from './schema';

export default class VideosRepository {
    static config(cfg: BarueriConfig, userId: string) {
        return new VideosRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.videosTable,
            cfg.videoByTokyo,
            userId,
        );
    }

    async create(Item) {
        Item = {
            id: uuidV4(),
            ...Item,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item,
                ConditionExpression: 'attribute_not_exists(id)',
            });
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError('Key already exists');
            }
            throw e;
        }

        return Item;
    }

    async list() {
        const {Items} = await this.documents.scanAll({
            TableName: this.table,
        });

        return Items
            .map(toNewFormat);
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {id},
        });

        return toNewFormat(Item);
    }

    async findByVideoId(videoId: string) {
        const {Items = []} = await this.documents.query({
            TableName: this.table,
            IndexName: this.byVideo,
            KeyConditionExpression: '#video = :video',
            ExpressionAttributeNames: {'#video': 'tokyo_video_id'},
            ExpressionAttributeValues: {':video': videoId},
        });

        return toNewFormat(Items[0]);
    }

    async patch(id: string, fieldName: string, fieldValue: unknown) {
        await this.documents.update({
            TableName: this.table,
            Key: {id},
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    async update(current: Video, patch: Partial<VideoDTO>) {
        const Item: Video = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return Item;
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byVideo: string,
        private user: string,
    ) {}
}

function toNewFormat(item) {
    if (!item) {
        return item;
    }

    return {
        thumbnail: 'https://pioneer.dev.app-gerencial.scisapp.com/static/media/login-bg.2cf4a30e0365fce24c11.png',
        tags: [],
        ...item,
    };
}
