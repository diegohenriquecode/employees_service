import {HierarchicalLevel} from 'modules/ranks/schema';

export type UserHierarchical = {
    account: string,
    user_id: string,
    hierarchical_level: number | null,
    rank: string | null,
    sector: string,
    subordinate_to: string | null,
    boss_hierarchical_level: number | null,
    boss_rank: string | null,
    subordinate_sector: string | null,
    disabled_user: boolean,
    disabled_rank: boolean,
};

export type UserHierarchicalOut = {
    account: string,
    user_id: string,
    hierarchical_level: number,
    rank: string | null,
    sector: string,
    subordinate_to: string | null,
    subordinate_sector: string | null,
    boss_hierarchical_level: number | null,
    boss_rank: string | null
};

export const HierarchicalNumbers = {
    [HierarchicalLevel.Presidency]: 0,
    [HierarchicalLevel.Director]: 1,
    [HierarchicalLevel.Management]: 2,
    [HierarchicalLevel.Supervision]: 3,
    [HierarchicalLevel.Operational]: 4,
};

export const HierarchicalValues = {
    0: HierarchicalLevel.Presidency,
    1: HierarchicalLevel.Director,
    2: HierarchicalLevel.Management,
    3: HierarchicalLevel.Supervision,
    4: HierarchicalLevel.Operational,
};
