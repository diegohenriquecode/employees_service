import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {BarueriConfig} from 'config';
import chunk from 'lodash/chunk';
import {ConflictError, NotFoundError} from 'modules/errors/errors';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {Evaluation, EvaluationPropsTyped, EvaluationType} from './schema';

export default class EvaluationsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new EvaluationsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.evaluationsTable,
            user,
            account,
        );
    }

    async create(props: EvaluationPropsTyped) {
        const Item: Evaluation = {
            id: uuidV4(),
            ...props,
            rev: 1,
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

    async batchCreate(batchCreateItems: EvaluationPropsTyped[]) {
        const Items: Evaluation[] = batchCreateItems.map((props) => ({
            ...props,
            id: uuidV4(),
            rev: 1,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        }));

        const groups = chunk(Items, 25);
        for (const group of groups) {
            await this.documents.batchWrite({
                RequestItems: {
                    [this.table]: group.map(Item => ({
                        PutRequest: {
                            Item: mapper.toRepo(Item),
                        },
                    })),
                },
            });
        }
    }

    async remove(employee: string, id: string) {
        const current = await this._retrieve(employee, id);

        const Item = {
            ...current,
            removed: true,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });
    }

    async _retrieve(employee: string, id: string) {
        const Key = this.getKey(employee, id);

        const {Item} = await this.documents.get({
            TableName: this.table,
            Key,
        });

        return Item;

    }

    async batchRemove(evaluations: Evaluation[]) {
        const groups = chunk(evaluations, 25);
        for (const group of groups) {
            await this.documents.batchWrite({
                RequestItems: {
                    [this.table]: group.map(Item => ({
                        DeleteRequest: {
                            Key: this.getKey(Item.employee, Item.id),
                        },
                    })),
                },
            });
        }
    }

    async retrieve(employee: string, id: string) {
        const Item = await this._retrieve(employee, id);

        if (Item && Item.removed === true) {
            throw new NotFoundError('No active register to this search');
        }

        const repoEvaluation = Item as InRepositoryEvaluation;

        return mapper.fromRepo(repoEvaluation);
    }

    async listByEmployee(employee: string, type: EvaluationType, projection = baseProjection) {
        const input: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            ExpressionAttributeNames: {
                '#account': 'account',
                '#_employee_id': '_employee_id',
                '#type': 'type',
                '#removed': 'removed',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':employee': `${employee}:`,
                ':type': type,
                ':false': false,
            },
            FilterExpression: 'begins_with(#type, :type) AND (#removed = :false OR attribute_not_exists(#removed))',
            KeyConditionExpression: '#account = :account AND begins_with(#_employee_id, :employee)',
        };

        if (projection.length) {
            projection.forEach(item => {
                input.ExpressionAttributeNames[`#${item}`] = item;
                input.ProjectionExpression = input.ProjectionExpression ? `${input.ProjectionExpression}, #${item}` : `#${item}`;
            });
        }

        const {Items} = await this.documents.queryAll(input);

        const repoEvaluations = Items as InRepositoryEvaluation[];
        return repoEvaluations.map(repoEvaluation => mapper.fromRepo(repoEvaluation));
    }

    async listByAccount(accountId: string) {
        const input: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            ExpressionAttributeNames: {
                '#account': 'account',
                '#removed': 'removed',
            },
            ExpressionAttributeValues: {
                ':account': accountId,
                ':false': false,
            },
            FilterExpression: '(#removed = :false OR attribute_not_exists(#removed))',
            KeyConditionExpression: '#account = :account',
        };

        const {Items} = await this.documents.queryAll(input);

        const repoEvaluations = Items as InRepositoryEvaluation[];
        return repoEvaluations.map(repoEvaluation => mapper.fromRepo(repoEvaluation));
    }

    async update(current: Evaluation, update: Partial<Evaluation>) {
        const Item: Evaluation & {_employee_id: string} = {
            ...current,
            ...update,
            rev: (current.rev ?? 0) + 1,
            _employee_id: this.getKey(current.employee, current.id)._employee_id,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        const params: DocumentClient.PutItemInput = {
            TableName: this.table,
            Item,
        };

        if (current.rev) {
            params.ConditionExpression = '#rev = :rev';
            params.ExpressionAttributeNames = {'#rev': 'rev'};
            params.ExpressionAttributeValues = {':rev': current.rev};
        }

        try {
            await this.documents.put(params);
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        return mapper.fromRepo(Item);
    }

    async batchUpdate(Items: {current: Evaluation, update: Partial<Evaluation>}[]) {
        const groups = chunk(Items, 25);
        for (const group of groups) {
            await this.documents.batchWrite({
                RequestItems: {
                    [this.table]: group.map(({current, update}) => {
                        const Item: Evaluation = {
                            ...current,
                            ...update,
                            rev: (current.rev ?? 0) + 1,
                            updated_at: moment().toISOString(),
                            updated_by: this.user,
                        };

                        return {
                            PutRequest: {
                                Item: mapper.toRepo(Item),
                            },
                        };
                    }),
                },
            });
        }
    }

    async batchGet(evaluations: Evaluation[]) {
        const Items: Evaluation[] = [];

        if (!evaluations || evaluations.length === 0) {
            return [];
        }

        const groups = chunk(evaluations, 100);
        const promises = [];
        for (const group of groups) {
            const keys = group.map(evaluation => this.getKey(evaluation.employee, evaluation.id));

            const params = {
                RequestItems: {
                    [this.table]: {
                        Keys: keys,
                    },
                },
            };

            promises.push(this.documents.batchGet(params));
        }

        const responses = await Promise.all(promises);

        for (const response of responses) {
            if (response.Responses && response.Responses[this.table]) {
                Items.push(...response.Responses[this.table] as Evaluation[]);
            }
        }
        return (Items as InRepositoryEvaluation[]).map(mapper.fromRepo);
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
    toRepo: (evaluation: Evaluation): InRepositoryEvaluation => {
        if (!evaluation) {
            return evaluation;
        }

        return {
            ...evaluation,
            _employee_id: `${evaluation.employee}:${evaluation.id}`,
        };
    },
    fromRepo: (evaluation: InRepositoryEvaluation): Evaluation => {
        if (!evaluation) {
            return evaluation;
        }

        const {_employee_id, ...result} = evaluation;

        return {
            ...result,
            disclosed_to_employee: evaluation.disclosed_to_employee || false,
        };
    },
};

type InRepositoryEvaluation = Evaluation & {
    _employee_id: string
};

const baseProjection = ['id', 'type', 'daysLate', 'deadline', 'finished_at', 'employee', 'responsible', 'sector', 'rank', 'status', 'read', 'read_at', 'disclosed_to_employee', 'created_at', 'created_by', 'updated_at', 'updated_by'];
