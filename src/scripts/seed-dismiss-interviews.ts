/* eslint-disable import/order */
import fs from 'fs';
require.extensions['.ejs'] = (m, fileName) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return m._compile(`module.exports=\`${fs.readFileSync(fileName)}\``, fileName);
};

import AWS from 'aws-sdk';
import AccountsService from 'modules/accounts/service';
import {NotFoundError} from 'modules/errors/errors';
import moment from 'moment';
import _, {set} from 'lodash';

import {BarueriConfig} from '../config';
import {SectorsByScenario, filledConfig, getDB, getEmployees, getEvaluationResponsible, getSectors, randomInt, withDateMonkeyPatched} from './utils';
import {AppUser, User} from 'modules/users/schema';
import DismissInterviewsService from 'modules/dismiss-interviews/service';
import {Knex} from 'knex';

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-dismiss-interviews.ts [ACCOUNT-SUBDOMAIN]');
    process.exit(2);
}

let argc = 2;
const account_subdomain = process.argv[argc++];
const dry_run = false;
const region = 'us-east-1';

AWS.config.region = region;
let config = {} as BarueriConfig;
let db: Knex;

async function main() {

    if (dry_run) {
        console.warn('******* DRYRUN *******');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    config = await filledConfig();

    db = getDB(config);

    const account = await AccountsService.config(config, 'seed-reprimands-suspensions')
        .findBySubdomain(account_subdomain);
    if (!account) {
        throw new NotFoundError(`Conta "${account_subdomain}" não encontrada`);
    }

    const allSectors = await getSectors(config, account.id);
    console.log('# sectors', allSectors.length);

    const allEmployees = await getEmployees(config, account.id, true);
    console.log('# employees', allEmployees.length);

    for (const scenario of Object.keys(SectorsByScenario)) {
        const sectors = SectorsByScenario[scenario];
        const distribution = Scenarios[scenario];
        console.log(scenario, ':', sectors.length, 'setores (', JSON.stringify(distribution), ')');
        for (const sectorName of sectors) {
            const sector = allSectors.find(s => s.name.toLowerCase() === sectorName.toLowerCase());
            if (!sector) {
                throw new NotFoundError(`Sector "${sectorName}" not found`);
            }
            const employees = allEmployees.filter(e => e.sector === sector.id);
            console.log(`Sector ${sector.name}: ${employees.length} employees`);

            const employeesToDismiss = employeesByDistribution(employees, distribution);
            let i = 2;
            for (const subject of employeesToDismiss) {
                const bossId = await getEvaluationResponsible(config, sector, subject.sectors[sector.id].is_manager, account.id);
                const boss = allEmployees.find(e => e.id === bossId) || subject;
                const date = moment().subtract(i, 'weeks').toISOString();
                const text = dismissDetails[randomInt(0, dismissDetails.length - 1)];
                await createDismissInterview(boss, subject, date, text);
                i += 4;
            }
        }
    }
}

function employeesByDistribution(employees: User[], distribution: typeof Scenarios.LowHappiness) {
    employees = _.shuffle(employees);
    const total = employees.length;

    return distribution <= total ? employees.splice(0, distribution) : employees.splice(0, total);
}

async function createDismissInterview(boss: User, subject: User, date: string, details: string) {
    console.log('Dismiss Interview', date.substring(0, 10), '>', subject.name);

    if (dry_run) {
        return;
    }

    const service = withDateMonkeyPatched(
        DismissInterviewsService.config(config, boss as AppUser, boss.account),
        'repository.documents.put',
        date,
    );

    await set(service, 'employeesService.usersService.repository.mysql._db', db).create(subject.id, {details, dismissed_at: date});
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
    LowProductivity: 3,
    HighProductivity: 0,
    LowHappiness: 2,
    LowManagerSupport: 2,
    BadClimate: 3,
};

const dismissDetails = [
    'Desempenho insatisfatório.',
    'Redução de pessoal devido a reestruturação da empresa.',
    'Pedido de demissão por motivos pessoais.',
    'Conflitos interpessoais com colegas de trabalho.',
    'Não seguiu as políticas da empresa após múltiplos avisos.',
];
