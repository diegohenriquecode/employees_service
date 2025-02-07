import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {Feedback, FeedbackProps} from './schema';

export default class FeedbacksRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new FeedbacksRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.feedbacksTable,
            user,
            account,
        );
    }

    async create(props: FeedbackProps) {
        const Item: Feedback = {
            id: uuidV4(),
            ...props,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: mapper.toRepo(Item),
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

    async update(current: Feedback, patch: Partial<Feedback>) {
        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: mapper.toRepo(Item),
        });

        return Item;
    }

    async retrieve(employee: string, id: string) {
        const Key = this.getKey(employee, id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        const repoFeedback = Item as InRepositoryFeedback;
        return mapper.fromRepo(repoFeedback);
    }

    async delete(employee: string, id: string) {
        const Key = this.getKey(employee, id);

        await this.documents.delete({
            TableName: this.table,
            Key,
        });
    }

    async listByEmployee(employee: string) {
        const {Items} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account AND begins_with(#_employee_id, :employee)',
            ProjectionExpression: 'id,employee,#read,sector,#type,created_at,created_by,updated_at,updated_by,#status,#text',
            ExpressionAttributeNames: {'#account': 'account', '#_employee_id': '_employee_id', '#type': 'type', '#read': 'read', '#status': 'status', '#text': 'text'},
            ExpressionAttributeValues: {':account': this.account, ':employee': employee},
        });

        const repoFeedbacks = Items.map(item => ({...item, text: item.text.substring(0, 25)})) as InRepositoryFeedback[];
        return repoFeedbacks.map(repoFeedback => mapper.fromRepo(repoFeedback));
    }

    private getKey(employee: string, id: string) {
        return {
            account: this.account,
            _employee_id: `${employee}:${id}`,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}

const mapper = {
    toRepo: (feedback: Feedback): InRepositoryFeedback => {
        if (!feedback) {
            return feedback;
        }

        return {
            ...feedback,
            _employee_id: `${feedback.employee}:${feedback.id}`,
        };
    },
    fromRepo: (feedback: InRepositoryFeedback): Feedback => {
        if (!feedback) {
            return feedback;
        }

        const {_employee_id, ...result} = feedback;

        return result;
    },
};

type InRepositoryFeedback = Feedback & {
    _employee_id: string
};
