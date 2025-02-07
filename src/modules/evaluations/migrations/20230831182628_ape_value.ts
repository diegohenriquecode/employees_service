import config from 'config';
import {EvaluationType} from 'modules/evaluations/schema';

import DynamoClient from '../../../utils/dynamo-client';

export async function up(): Promise<void> {
    const {Items: evaluations} = await documents
        .scanAll({
            TableName: config.evaluationsTable,
            FilterExpression: '#type = :type',
            ExpressionAttributeNames: {'#type': 'type'},
            ExpressionAttributeValues: {':type': EvaluationType.ape},
        });

    for (const evaluation of evaluations) {
        let updated = false;

        for (const answer of evaluation.criteria.answers) {
            if (answer.value === 5) {
                answer.value = 4;

                updated = true;
            }
        }

        if (updated) {
            await documents.update ({
                TableName: config.evaluationsTable,
                Key: {account: evaluation.account, _employee_id: `${evaluation.employee}:${evaluation.id}`},
                UpdateExpression: 'SET criteria = :criteria, updated_by = :updated_by',
                ExpressionAttributeValues: {':criteria': evaluation.criteria, ':updated_by': 'migration'},
            });
        }

    }

}

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: config.local,
});
