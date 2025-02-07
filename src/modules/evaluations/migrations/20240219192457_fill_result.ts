import config from 'config';
import {Knex} from 'knex';
import {chunk} from 'lodash';

import DynamoClient from '../../../utils/dynamo-client';
import {Evaluation, EvaluationAPE, EvaluationDecisionMatrix, EvaluationType, MultidirectionalRegexp} from '../schema';
import {getResultByCoordinates} from '../service-matrix';

export async function up(knex: Knex): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable});
    for (const account of accounts) {
        const allDoneEvaluations = await listAccountDoneEvaluations(account.id);

        const groups = chunk(allDoneEvaluations, 100);

        for (const group of groups) {
            await Promise.all(group.map(item => {
                if (!MultidirectionalRegexp.test(item.type)) {
                    return documents.update({
                        TableName: config.evaluationsTable as string,
                        Key: {account: item.account, _employee_id: item._employee_id},
                        UpdateExpression: 'SET #result = :result',
                        ExpressionAttributeNames: {'#result': 'result'},
                        ExpressionAttributeValues: {':result': calcResult(item as Evaluation)},
                    });
                } else {
                    knex(config.evaluationsTable)
                        .where({account: item.account, id: item.id})
                        .update({result: item.result});
                }
            }));
        }
    }
}

export async function down(knex: Knex): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable});
    for (const account of accounts) {
        const allDoneEvaluations = await listAccountDoneEvaluations(account.id);

        const groups = chunk(allDoneEvaluations, 100);

        for (const group of groups) {
            await Promise.all(group.map(item => {
                if (!MultidirectionalRegexp.test(item.type)) {
                    return documents.update({
                        TableName: config.evaluationsTable as string,
                        Key: {account: item.account, _employee_id: item._employee_id},
                        UpdateExpression: 'REMOVE #result',
                        ExpressionAttributeNames: {'#result': 'result'},
                    });
                } else {
                    knex(config.evaluationsTable)
                        .where({account: item.account, id: item.id})
                        .update({result: null});
                }
            }));
        }
    }
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});

const listAccountDoneEvaluations = async (account: string) => {
    const {Items: allDoneEvaluations} = await documents.queryAll({
        TableName: config.evaluationsTable,
        KeyConditionExpression: '#account = :account',
        FilterExpression: '#status = :done',
        ExpressionAttributeNames: {
            '#account': 'account',
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':account': account,
            ':done': 'done',
        },
    });

    return allDoneEvaluations;
};

const calcResult = (item: Evaluation) => {
    if (item.type === EvaluationType.ape) {
        return (item as EvaluationAPE).criteria.answers.reduce((acc, answer) => acc + answer.value, 0);
    } else if (item.type === EvaluationType.decision_matrix) {
        const emotionalAvg = (item as EvaluationDecisionMatrix).emotional.avg || 0;
        const technicalAvg = (item as EvaluationDecisionMatrix).technical.avg || 0;
        return getResultByCoordinates(technicalAvg, emotionalAvg);
    } else if (MultidirectionalRegexp.test(item.type)) {
        return item.result;
    }
};
