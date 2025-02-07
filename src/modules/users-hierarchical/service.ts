import {BarueriConfig} from 'config';
import isEqual from 'lodash/isEqual';
import OrgChartsService from 'modules/orgchart/service';
import RanksRepository from 'modules/ranks/repository';
import {HierarchicalLevel, Rank} from 'modules/ranks/schema';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

import UsersHierarchicalMysqlRepository from './repository';
import {UserHierarchicalOut, HierarchicalNumbers} from './schema';

export default class UsersHierarchicalService {
    static config(cfg: BarueriConfig, user: User, account: string) {
        return new UsersHierarchicalService(
            RanksRepository.config(cfg, user.id, account),
            OrgChartsService.config(cfg, user, account),
            UsersHierarchicalMysqlRepository.config(cfg, user.id, account),
            UsersService.config(cfg, user, account),
            account || '',
        );
    }

    async list() {
        const clauses = [];

        if (this.account) {
            clauses.push({'account': {'$eq': this.account}});
        }

        clauses.push({'hierarchical_level': {'$ne': null}});
        clauses.push({'disabled_user': {'$eq': false}});

        const dbQuery = {'$and': clauses};

        const items = await this.mysql.list(dbQuery);

        return items;
    }

    async handleUserNewVersion(type: 'INSERT' | 'MODIFY' | 'REMOVE', OldItem: User | null, NewItem: User | null) {
        if (type === 'INSERT') {

            if (!NewItem?.rank) {
                return;
            }

            const rank = await this.ranks.retrieve(NewItem.rank);

            const sectorDetails = await this.orgChartsService.retrieve(NewItem.sector);
            const bossSector = await this.orgChartsService.managersSectorFor(sectorDetails, false);

            const boss = bossSector.manager ? await this.retrieve(bossSector.manager) : null;

            await this.mysql.create({
                account: this.account,
                user_id: NewItem.id,
                rank: NewItem.rank,
                sector: sectorDetails.id,
                hierarchical_level: HierarchicalNumbers[rank.hierarchical_level as keyof typeof HierarchicalLevel],
                subordinate_to: sectorDetails.manager,
                subordinate_sector: sectorDetails.id,
                boss_hierarchical_level: boss ? boss.hierarchical_level : null,
                boss_rank: boss ? boss.rank : undefined,
                disabled_user: NewItem.disabled || false,
                disabled_rank: rank?.disabled || false,
            });
        }
        if (type === 'MODIFY' && NewItem && OldItem) {
            if (NewItem.rank && NewItem.rank !== OldItem?.rank) {
                const newRank = await this.ranks.retrieve(NewItem.rank);

                await this.mysql.update({user_id: NewItem.id}, {
                    rank: newRank.id,
                    hierarchical_level: newRank.hierarchical_level ? HierarchicalNumbers[newRank.hierarchical_level as keyof typeof HierarchicalLevel] : null,
                });

                await this.mysql.update({subordinate_to: NewItem.id}, {
                    boss_hierarchical_level: newRank.hierarchical_level ? HierarchicalNumbers[newRank.hierarchical_level as keyof typeof HierarchicalLevel] : null,
                    boss_rank: newRank.id,
                });
            }

            if (!isEqual(NewItem.sectors, OldItem?.sectors)) {
                await this.mysql.delete({user_id: NewItem.id});

                const sectorsToAdd = [];

                for (const sector of Object.keys(NewItem.sectors)) {
                    const rank = NewItem.rank ? await this.ranks.retrieve(NewItem.rank) : null;

                    const sectorDetails = await this.orgChartsService.retrieve(NewItem.sectors[sector].subordinate_to);
                    const boss = sectorDetails.manager ? await this.users.retrieve(sectorDetails.manager) : null;
                    const bossRank = boss?.rank ? await this.ranks.retrieve(boss.rank) : null;

                    sectorsToAdd.push({
                        account: this.account,
                        user_id: NewItem.id,
                        rank: rank ? NewItem.rank : null,
                        sector,
                        hierarchical_level: rank ? HierarchicalNumbers[rank.hierarchical_level as keyof typeof HierarchicalLevel] : null,
                        subordinate_to: boss ? boss.id : null,
                        subordinate_sector: sectorDetails.id,
                        boss_hierarchical_level: bossRank?.hierarchical_level ? HierarchicalNumbers[bossRank.hierarchical_level] : null,
                        boss_rank: boss?.rank || null,
                        disabled_user: NewItem?.disabled || false,
                        disabled_rank: rank?.disabled || false,
                    });
                }

                await this.mysql.createArray(sectorsToAdd);
            }

            if (NewItem.disabled !== OldItem?.disabled) {
                await this.mysql.update({user_id: NewItem.id}, {
                    disabled_user: NewItem.disabled,
                });
            }
        }
    }

    async handleRankNewVersion(type: 'INSERT' | 'MODIFY' | 'REMOVE', OldItem: Rank | null, NewItem: Rank | null) {
        if (type === 'MODIFY' && OldItem && NewItem) {
            if (OldItem.hierarchical_level !== NewItem.hierarchical_level) {
                await this.mysql.update({rank: NewItem.id}, {
                    rank: NewItem.id,
                    hierarchical_level: HierarchicalNumbers[NewItem.hierarchical_level],
                });

                await this.mysql.update({boss_rank: NewItem.id}, {
                    boss_rank: NewItem.id,
                    boss_hierarchical_level: HierarchicalNumbers[NewItem.hierarchical_level],
                });
            }

            if (OldItem.disabled !== NewItem.disabled) {
                await this.mysql.update({rank: NewItem.id}, {
                    disabled_rank: NewItem.disabled,
                });
            }

        }
    }

    async retrieve(user_id: string) {
        return await this.mysql.retrieve({'$and': [{'account': {'$eq': this.account}}, {'user_id': {'$eq': user_id}}]});
    }

    async retrieveByUserIdAndSector(user_id: string, sector: string) {
        return await this.mysql.retrieve({'$and': [{'account': {'$eq': this.account}}, {'user_id': {'$eq': user_id}}, {'sector': {'$eq': sector}}]});
    }

    static sanitizedSubordinateTo = (hierarchical: UserHierarchicalOut) => {
        if (hierarchical.boss_hierarchical_level === null || hierarchical.boss_hierarchical_level === undefined) {
            return null;
        }

        return hierarchical.boss_hierarchical_level < hierarchical.hierarchical_level ? hierarchical.subordinate_to : null;
    };

    constructor(
        private ranks: RanksRepository,
        private orgChartsService: OrgChartsService,
        private mysql: UsersHierarchicalMysqlRepository,
        private users: UsersService,
        private account: string,
    ) { }
}
