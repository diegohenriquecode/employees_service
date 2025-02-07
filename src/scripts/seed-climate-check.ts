/* eslint-disable import/order */
import fs from 'fs';
import AWS from 'aws-sdk';
import AccountsService from 'modules/accounts/service';
import {ConflictError, NotFoundError} from 'modules/errors/errors';
import moment, {Moment} from 'moment';

import {BarueriConfig} from '../config';
import {User} from '../modules/users/schema';
import {SectorsByScenario, filledConfig, getEmployees, getEvaluationResponsible, getSectors, randomOption} from './utils';
import ClimateChecksRepository, {ClimateCheckAnswers} from 'modules/climate-checks/repository';
import {Sector} from 'modules/orgchart/schema';
import EventsTopicService from 'modules/events/event-topic-service';
import {ClimateCheckHistoryItemType} from 'modules/climate-check-history/schema';

require.extensions['.ejs'] = (m, fileName) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return m._compile(`module.exports=\`${fs.readFileSync(fileName)}\``, fileName);
};

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-climate-check.ts [ACCOUNT-SUBDOMAIN]');
    process.exit(2);
}

let argc = 2;
const account_subdomain = process.argv[argc++];
const dry_run = false;
const region = 'us-east-1';
const userId = 'seed-org-climate';

AWS.config.region = region;
let config = {} as BarueriConfig;
let events: EventsTopicService;

async function main() {
    if (dry_run) {
        console.warn('******* DRYRUN *******');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    config = await filledConfig();

    events = EventsTopicService.config(config);

    const account = await AccountsService.config(config, 'seed-feedbacks')
        .findBySubdomain(account_subdomain);
    if (!account) {
        throw new NotFoundError(`Conta "${account_subdomain}" não encontrada`);
    }

    const allSectors = await getSectors(config, account.id);
    console.log('# sectors', allSectors.length);

    const allEmployees = await getEmployees(config, account.id, true);
    console.log('# employees', allEmployees.length);

    const days = moment().diff(moment().subtract(3, 'months'), 'days');
    const init = moment().startOf('day').subtract(3, 'months');
    for (let i = 0; i < days; i++) {
        const date = moment(init).add(i + 1, 'days');

        for (const scenario of Object.keys(SectorsByScenario)) {
            const sectors = SectorsByScenario[scenario];
            const distribution = Scenarios[scenario];
            console.log(scenario, ':', sectors.length, 'setores (', JSON.stringify(distribution), ')');

            await Promise.all(sectors.map(async (sectorName: string) => {
                const sector = allSectors.find(s => s.name.toLowerCase() === sectorName.toLowerCase());
                if (!sector) {
                    throw new NotFoundError(`Sector "${sectorName}" not found`);
                }
                const employees = allEmployees.filter(e => e.sectors[e.sector].subordinate_to === sector.id);
                console.log(`Sector ${sector.name}: ${employees.length} employees`);

                for (const subject of employees) {
                    const grades = gradesByDistribution(distribution);
                    const bossId = await getEvaluationResponsible(config, sector, subject.sectors[subject.sector].is_manager, account.id);
                    const boss = allEmployees.find(e => e.id === bossId) || subject;
                    await createClimateCheck(boss, subject, sector, date, grades as ClimateCheckAnswers);
                }
            }));
        }

        if (!dry_run) {
            for (const sector of allSectors) {
                const message = {account: account.id, date: date.format('YYYY-MM-DD'), sector: sector?.id};
                await events
                    .publish('DailyClimateCheckAssiduity', 1, userId, JSON.stringify(message), account.id);
                await events
                    .publish('DailyClimateCheckHistory', 1, userId, JSON.stringify({...message, type: ClimateCheckHistoryItemType.shallow}), account.id);
                await events
                    .publish('DailyClimateCheckHistory', 1, userId, JSON.stringify({...message, type: ClimateCheckHistoryItemType.deep}), account.id);
            }
        }

    }
}

function gradesByDistribution(distribution: typeof Scenarios.LowHappiness) {
    return {
        happy: randomOption(...distribution.happy),
        productive: randomOption(...distribution.productive),
        supported: randomOption(...distribution.supported),
    };
}

async function createClimateCheck(boss: User, subject: User, sector: Sector, date: Moment, grades: ClimateCheckAnswers) {
    const currentCheck = `${date.format('YYYY-MM-DD')}#00`;

    if (dry_run) {
        return;
    }

    try {
        await ClimateChecksRepository.config(config, subject.account, subject.id)
            .create(subject.id, sector.id, sector.path, subject.rank, currentCheck, grades, boss.id);
    } catch (e) {
        if (e instanceof ConflictError) {
            console.warn('Resposta já existe');
        } else {
            throw e;
        }
    }
}

(async () => {
    try {
        await main();
        process.exit(0);
    } catch (e) {
        console.error((e as Error).message);
        process.exit(1);
    }
})();

const Scenarios = {
    LowProductivity: {happy: [2, 3], productive: [1, 1, 3], supported: [1, 2, 3]},
    HighProductivity: {happy: [4, 5], productive: [5, 5, 4], supported: [5, 4]},
    LowHappiness: {happy: [1, 2], productive: [1, 2, 3], supported: [2, 3]},
    LowManagerSupport: {happy: [1, 2, 3], productive: [1, 2], supported: [1, 2]},
    BadClimate: {happy: [1, 3], productive: [2, 3], supported: [1, 2, 3]},
};
