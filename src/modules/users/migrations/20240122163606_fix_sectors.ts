import config from 'config';
import DynamoClient from 'utils/dynamo-client';

import UsersMysqlRepository from '../repository.mysql';

export async function up(): Promise<void> {

    const clauses = {'$and': [{created_at: {'$exists': false}}]};

    const relationsToUpdate = await userRepository.listRelations(clauses);

    for (const relation of relationsToUpdate) {

        const {Item: employee} = await documents.get({
            TableName: config.usersTable,
            Key: {account: relation.account, id: relation.user},
        });

        if (employee) {
            if (!employee.sectors[relation.sector]) {
                continue;
            }

            console.log(`Removing sector ${relation.sector} from ${employee.name}`);

            await documents.update({
                TableName: config.usersTable,
                Key: {account: relation.account, id: employee.id},
                UpdateExpression: 'REMOVE #sectors.#sector',
                ExpressionAttributeNames: {
                    '#sectors': 'sectors',
                    '#sector': relation.sector,
                },
            });

        }
    }
}

export async function down(): Promise<void> {
    return;
}

const userRepository = UsersMysqlRepository.config(config);

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
