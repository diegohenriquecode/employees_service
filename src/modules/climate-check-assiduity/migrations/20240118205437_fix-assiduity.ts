import config from 'config';

import DynamoClient from '../../../utils/dynamo-client';

export async function up(): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable});
    for (const account of accounts) {
        const {Items: allAssiduities} = await documents.queryAll({
            TableName: config.climateCheckAssiduityTable,
            KeyConditionExpression: 'account = :account',
            ExpressionAttributeValues: {':account': account.id},
        });

        for (const assiduity of allAssiduities) {

            if (Object.values(assiduity.assiduity).some(employeeAssiduity => !!employeeAssiduity)) {
                continue;
            }

            const employees = Object.keys(assiduity.assiduity);
            const employeesClimateCheck = await Promise.all(
                employees.map(async employee => {
                    const {Item} = await documents.get({
                        TableName: config.climateChecksTable,
                        Key: {account: account.id, _DateEmployee: `${assiduity.date}#00#${employee}#${assiduity.sector}`},
                    });

                    return {employee, climateCheck: Item};
                }),
            );

            const updatedAssiduity = employeesClimateCheck.reduce((acc, v) => ({...acc, [v.employee]: !!v.climateCheck}), {});

            await documents.update({
                TableName: config.climateCheckAssiduityTable,
                Key: {account: account.id, _SectorDate: assiduity._SectorDate},
                UpdateExpression: 'SET assiduity = :assiduity',
                ExpressionAttributeValues: {':assiduity': updatedAssiduity},
            });
        }
    }
}

export async function down(): Promise<void> {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
