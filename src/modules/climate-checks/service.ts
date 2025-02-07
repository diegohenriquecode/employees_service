import {MongoQuery} from '@ucast/mongo';
import {Account} from 'modules/accounts/schema';
import {ROOT_ID} from 'modules/orgchart/repository';
import {Sector} from 'modules/orgchart/schema';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';
import moment from 'moment-timezone';

import {BarueriConfig} from '../../config';
import {BadRequestError} from '../errors/errors';
import OrgChartsService from '../orgchart/service';
import ClimateChecksRepository, {ClimateCheckAnswers} from './repository';
import {ClimateCheckNumbers as ClimateCheckScores, ClimateCheckResponse} from './schema';

export default class ClimateChecksService {

    static config(cfg: BarueriConfig, account: Account, user: User, sectorQuery: MongoQuery = {}): ClimateChecksService {
        return new ClimateChecksService(
            ClimateChecksRepository.config(cfg, account.id, user.id),
            OrgChartsService.config(cfg, user, account.id, sectorQuery),
            user,
            account,
            UsersService.config(cfg, user, account.id),
        );
    }

    async hasPending(): Promise<{ [key: string]: boolean }> {
        const result: { [key: string]: boolean } = {};

        const currentCheck = await this.currentCheck();

        if (!currentCheck) {
            return result;
        }

        const sectors = Object.keys(this.user.sectors);

        const answers = await this.repository.listByEmployee(this.user.id, currentCheck);
        const answerBySector = Object.fromEntries(answers.map(a => [a.sector, a]));

        for (const sectorId of sectors) {

            if (this.user.sectors[sectorId].is_manager && sectorId === ROOT_ID) {
                result[sectorId] = false;
            } else if (this.user.id === this.account.responsible) {
                result[sectorId] = false;
            } else {
                const id: string = this.user.sectors[sectorId].is_manager
                    ? this.user.sectors[sectorId].subordinate_to
                    : sectorId;

                result[sectorId] = !answerBySector[id];
            }
        }

        return result;
    }

    async submit(answers: ClimateCheckAnswers, sectorId: string): Promise<void> {
        const currentCheck = await this.currentCheck();
        if (!currentCheck) {
            throw new BadRequestError();
        }

        if (!Object.keys(this.user.sectors).includes(sectorId)) {
            throw new BadRequestError();
        }

        if (this.user.id === this.account.responsible) {
            throw new BadRequestError();
        }

        if (this.user.sectors[sectorId]?.is_manager && sectorId === ROOT_ID) {
            throw new BadRequestError();
        }

        const id: string = this.user.sectors[sectorId].is_manager
            ? this.user.sectors[sectorId].subordinate_to
            : sectorId;
        const sector: Sector = await this.sectors.retrieve(id);

        const manager = await this.users.getManager({id: this.user.id, sector: sectorId}) as string;

        await this.repository
            .create(this.user.id, sector.id, sector.path, this.user.rank, currentCheck, answers, manager);
    }

    async dailyCheck(sectorId: string, checkDate: Date): Promise<ClimateCheckResponse> {
        const date = await this.currentCheck(checkDate);
        if (!date) {
            return {
                happy: 0,
                productive: 0,
                supported: 0,
                date: '',
                sector: sectorId,
            };
        }

        await this.sectors.retrieve(sectorId);
        const climateChecks = await this.repository
            .allOfDayBySectorId(date, sectorId);

        return {
            ...computeDailyCheck(climateChecks),
            date,
            sector: sectorId,
        };
    }

    async deepDailyCheck(sectorId: string, checkDate: Date): Promise<ClimateCheckResponse> {
        const date = await this.currentCheck(checkDate);
        if (!date) {
            return {
                happy: 0,
                productive: 0,
                supported: 0,
                date: '',
                sector: sectorId,
            };
        }

        const requestSector = await this.sectors.retrieve(sectorId);
        const climateChecks = await this.repository
            .allOfDayBySectorPath(date, requestSector.id);

        return {
            ...computeDailyCheck(climateChecks),
            date,
            sector: sectorId,
        };
    }

    async currentCheck(date?: Date): Promise<string|null> {

        if (!this.account.modules || this.account.modules?.climateCheck === false) {
            return null;
        }

        const currentTime = moment(date).tz(this.account.timezone);

        const accountCurrentOffset = '00';

        return `${currentTime.format('YYYY-MM-DD')}#${accountCurrentOffset}`;

    }

    constructor(
        private repository: ClimateChecksRepository,
        private sectors: OrgChartsService,
        private user: User,
        private account: Account,
        private users: UsersService,
    ) {}
}

const minClimateCheckResponses = 3;

export function computeDailyCheck(climateChecks: ClimateCheckScores[]): ClimateCheckScores {
    const total: ClimateCheckScores = {
        happy: 0,
        productive: 0,
        supported: 0,
    };

    if (climateChecks.length < minClimateCheckResponses) {
        return total;
    }

    const keys = Object.keys(total) as (keyof ClimateCheckScores)[];

    climateChecks.forEach(item => {
        keys.forEach(key => {
            total[key] += item[key] || 0;
        });
    });

    const means: ClimateCheckScores = {
        happy: 0,
        productive: 0,
        supported: 0,
    };
    keys.forEach(key => {
        means[key] = climateChecks.length && (total[key] / climateChecks.length);
    });

    return means;
}
