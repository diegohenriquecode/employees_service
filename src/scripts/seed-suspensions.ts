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
import _ from 'lodash';

import {BarueriConfig} from '../config';
import {SectorsByScenario, filledConfig, getEmployees, getEvaluationResponsible, getSectors, randomInt} from './utils';
import {Account} from 'modules/accounts/schema';
import {User} from 'modules/users/schema';
import SuspensionsService from 'modules/suspensions/service';
import SuspensionsRepository from 'modules/suspensions/repository';
import {SUSPENSION_STATUS} from 'modules/suspensions/schema';

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-suspensions.ts [ACCOUNT-SUBDOMAIN]');
    process.exit(2);
}

let argc = 2;
const account_subdomain = process.argv[argc++];
const dry_run = false;
const region = 'us-east-1';

AWS.config.region = region;
let config = {} as BarueriConfig;

async function main() {

    if (dry_run) {
        console.warn('******* DRYRUN *******');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    config = await filledConfig();

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

            const groups = employeesByDistribution(employees, distribution);
            for (const group of groups) {
                const groupQuantity = group.quantity;

                if (groupQuantity === 0) {
                    continue;
                }

                const firstSuspensionDate = moment().subtract(2, 'weeks').toISOString();
                const secondSuspensionDate = moment().subtract(6, 'weeks').toISOString();

                for (const subject of group.items) {
                    const employeeId = await getEvaluationResponsible(config, sector, subject.sectors[sector.id].is_manager, account.id);
                    const employee = allEmployees.find(e => e.id === employeeId) || subject;
                    const text = suspensions[randomInt(0, suspensions.length - 1)];
                    await createSuspension(employee, subject, firstSuspensionDate, text);

                    if (groupQuantity > 1) {
                        const text2 = suspensions[randomInt(0, suspensions.length - 1)];
                        await createSuspension(employee, subject, secondSuspensionDate, text2);
                    }
                }
            }
        }
    }
}

function employeesByDistribution(employees: User[], distribution: typeof Scenarios.LowHappiness) {
    employees = _.shuffle(employees);
    const total = employees.length;

    return distribution.map(({percentage, quantity}) => {
        const splicedEmployees = employees.splice(0, Math.floor(percentage * total));
        if (percentage - (splicedEmployees.length / total) > 0.05) {
            console.warn(`${total} não é suficiente para satisfazer ${percentage * 100}% de suspensões`);
        }

        return {
            items: splicedEmployees,
            quantity,
        };
    });
}

async function createSuspension(boss: User, subject: User, date: string, text:string) {
    console.log('Suspension', date.substring(0, 10), '>', subject.name);

    if (dry_run) {
        return;
    }

    const service = SuspensionsService.config(config, boss, {id: boss.account} as Account);
    const repository = SuspensionsRepository.config(config, boss.id, boss.account);
    const {id} = await service.create(subject.id, {description: text, start: date, end: moment(date).add(1, 'days').toISOString()});
    await service.generate(subject.id, id);
    const suspension = await repository.retrieve(subject.id, id);
    await repository.update(suspension, {
        status: SUSPENSION_STATUS.SENT,
        _AttKey: suspension._DocKey,
        created_at: date,
        updated_at: date,
    });
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
    LowProductivity: [{percentage: 0.2, quantity: 1}],
    HighProductivity: [{percentage: 0, quantity: 0}],
    LowHappiness: [{percentage: 0.25, quantity: 1}],
    LowManagerSupport: [{percentage: 0.1, quantity: 1}],
    BadClimate: [{percentage: 0.25, quantity: 2}],
};

const suspensions = [
    'Devido a violação de políticas da empresa, você está suspenso por 3 dias.',
    'Após uma revisão de desempenho, decidimos suspendê-lo temporariamente por uma semana.',
    'Você foi suspenso devido a comportamento inadequado no ambiente de trabalho.',
    'Sua conduta recente levou a uma suspensão imediata por tempo indeterminado.',
    'Foi identificado um problema sério em sua conduta e, como resultado, você está suspenso por 2 semanas.',
];
