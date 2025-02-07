import {BarueriConfig} from 'config';
import {ForbiddenError} from 'modules/errors/errors';
import OrgChartsService from 'modules/orgchart/service';
import {User} from 'modules/users/schema';
import moment from 'moment';

import ClimateCheckHistoryRepository from './repository';
import {ClimateCheckHistoryItem, ClimateCheckHistoryItemType} from './schema';

export default class ClimateCheckHistoryService {

    static config(config: BarueriConfig, account: string, user: User, sectorQuery: any = null) {
        return new ClimateCheckHistoryService(
            ClimateCheckHistoryRepository.config(config, account),
            OrgChartsService.config(config, user, account, sectorQuery),
            account,
        );
    }

    async list(sectorId: string, type: ClimateCheckHistoryItemType, from: moment.Moment, to: moment.Moment): Promise<ClimateCheckHistoryItem[]> {
        const sector = await this.sectors.retrieve(sectorId);
        if (!this.sectors.hasPermission(sector)) {
            throw new ForbiddenError();
        }
        const history = await this.repository.list(sectorId, type, from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'));
        return fillMissingDays(history, sectorId, type, from, to, this.account);
    }

    constructor(
        private repository: ClimateCheckHistoryRepository,
        private sectors: OrgChartsService,
        private account: string,
    ) {}
}

function fillMissingDays(history: ClimateCheckHistoryItem[], sectorId: string, type: ClimateCheckHistoryItemType, from: moment.Moment, to: moment.Moment, account: string) {
    const daysBetween = to.diff(from, 'days') + 1;
    const result: ClimateCheckHistoryItem[] = [];
    for (let i = 0; i < daysBetween; i++) {
        const date = moment(from).add(i, 'days').format('YYYY-MM-DD');
        const found = history.find(item => item.date === date);
        result.push(found || {
            account: account,
            created_at: moment().toISOString(),
            date,
            happy: 0,
            productive: 0,
            sector: sectorId,
            supported: 0,
            type,
        });
    }
    return result;
}
