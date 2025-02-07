import {ClimateCheckNumbers} from 'modules/climate-checks/schema';

export enum ClimateCheckHistoryItemType {
    shallow = 'shallow',
    deep = 'deep',
}

export type ClimateCheckHistoryItem = ClimateCheckNumbers & {
    account: string
    created_at: string
    date: string
    sector: string
    type: ClimateCheckHistoryItemType
};

export type InternalClimateCheckHistoryItem = ClimateCheckHistoryItem & {
    _SectorTypeDate: string // exemplo: 'sector_id:type:date'
};
