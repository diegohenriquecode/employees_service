import {Knex} from 'knex';
import {NotFoundError} from 'modules/errors/errors';
import {HierarchicalLevel} from 'modules/ranks/schema';
import moment from 'moment';
import DynamoClient from 'utils/dynamo-client';

import config from '../../../config';
import {UserHierarchical, HierarchicalNumbers} from '../schema';

export async function up(knex: Knex): Promise<void> {
    const {Items: accounts} = await documents
        .scanAll({TableName: config.accountsTable});

    if (accounts.length === 0) {
        throw new NotFoundError('Não existem contas cadastradas');
    }

    for (const account of accounts) {
        const {Items: allUsers} = await documents
            .queryAll({
                TableName: config.usersTable,
                KeyConditionExpression: 'account = :account',
                ExpressionAttributeValues: {':account': account.id},
            });

        const usersToCreate: UserHierarchical[] = [];

        const {Items: accountRanks} = await documents
            .queryAll({
                TableName: config.ranksTable,
                KeyConditionExpression: 'account = :account',
                ExpressionAttributeValues: {':account': account.id},
            });

        const {Items: accountSectors} = await documents
            .queryAll({
                TableName: config.orgSectorsTable,
                KeyConditionExpression: 'account = :account',
                ExpressionAttributeValues: {':account': account.id},
            });

        for (const user of allUsers) {
            const sectors = user.sectors ? Object.keys(user.sectors) : [];

            let userRank = null;
            if (user.rank) {
                userRank = accountRanks.find(rank => rank.id === user.rank);
            }

            for (const sector of sectors) {
                const subordinateSector = user.sectors[sector as string].subordinate_to;
                const sectorDetails = accountSectors.find(s => s.id === subordinateSector);

                const boss = sectorDetails?.manager ? allUsers.filter(u => u.id === sectorDetails.manager)[0] : null;

                let bossRank = null;
                if (boss && boss.rank) {
                    bossRank = accountRanks.find(rank => rank.id === boss.rank);
                }

                usersToCreate.push({
                    account: account.id,
                    user_id: user.id,
                    sector: sector as string,
                    rank: user.rank || null,
                    hierarchical_level: (userRank && userRank.hierarchical_level) ? HierarchicalNumbers[userRank.hierarchical_level as keyof typeof HierarchicalLevel] : null,
                    subordinate_to: sectorDetails ? sectorDetails.manager : null,
                    boss_hierarchical_level: (bossRank && bossRank.hierarchical_level) ? HierarchicalNumbers[bossRank.hierarchical_level as keyof typeof HierarchicalLevel] : null,
                    boss_rank: boss ? boss.rank : null,
                    subordinate_sector: subordinateSector || null,
                    disabled_user: user.disabled || false,
                    disabled_rank: userRank?.disabled || false,
                });
            }
        }

        const now = moment().toISOString();

        if (usersToCreate.length > 0) {
            await knex(config.usersHierarchicalMysqlTable)
                .insert(usersToCreate.map(item => ({
                    ...item,
                    updated_by: 'users-hierarchical-migration',
                    created_at: now,
                    updated_at: now,
                })));
        }
    }
}

export async function down() {
    return;
}

const documents = new DynamoClient({
    debug: true,
    isLocal: process.env.IS_OFFLINE?.toString() === 'true',
});
