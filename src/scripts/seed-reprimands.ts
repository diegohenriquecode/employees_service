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
import ReprimandsService from 'modules/reprimands/service';
import {Account} from 'modules/accounts/schema';
import {REPRIMAND_STATUS} from 'modules/reprimands/schema';
import ReprimandsRepository from 'modules/reprimands/repository';
import {User} from 'modules/users/schema';

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-reprimands.ts [ACCOUNT-SUBDOMAIN]');
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

    const account = await AccountsService.config(config, 'seed-reprimands')
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

                const firstReprimandDate = moment().subtract(2, 'weeks').toISOString();
                const secondReprimandDate = moment().subtract(6, 'weeks').toISOString();

                for (const subject of group.items) {
                    const employeeId = await getEvaluationResponsible(config, sector, subject.sectors[sector.id].is_manager, account.id);
                    const employee = allEmployees.find(e => e.id === employeeId) || subject;
                    const text = reprimands[randomInt(0, reprimands.length - 1)];
                    await createReprimand(employee, subject, firstReprimandDate, text, subject.sector);

                    if (groupQuantity > 1) {
                        const text2 = reprimands[randomInt(0, reprimands.length - 1)];
                        await createReprimand(employee, subject, secondReprimandDate, text2, subject.sector);
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
        const reprimandsEmployees = employees.splice(0, Math.floor(percentage * total));
        if (percentage - (reprimandsEmployees.length / total) > 0.05) {
            console.warn(`${total} não é suficiente para satisfazer ${percentage * 100}% de advertências`);
        }

        return {
            items: reprimandsEmployees,
            quantity,
        };
    });
}

async function createReprimand(boss: User, subject: User, date: string, text:string, sector: string) {
    console.log('Reprimand', date.substring(0, 10), '>', subject.name);

    if (dry_run) {
        return;
    }

    const service = ReprimandsService.config(config, boss, {id: boss.account} as Account);
    const repository = ReprimandsRepository.config(config, boss.id, boss.account);
    const {id} = await service.create(subject.id, {description: text, sector});
    await service.generate(subject.id, id);
    const reprimand = await repository.retrieve(subject.id, id);
    await repository.update(reprimand, {
        status: REPRIMAND_STATUS.SENT,
        _AttKey: reprimand._DocKey,
        created_at: date,
        updated_at: date,
        date,
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
    HighProductivity: [{percentage: 0.1, quantity: 1}],
    LowHappiness: [{percentage: 0.2, quantity: 1}, {percentage: 0.1, quantity: 2}],
    LowManagerSupport: [{percentage: 0.1, quantity: 1}],
    BadClimate: [{percentage: 0.15, quantity: 1}, {percentage: 0.1, quantity: 2}],
};

const reprimands = [
    `Caro colaborador, observamos recentemente a falta de cumprimento de compromissos estabelecidos com seus clientes. 
    Ressaltamos a importância de manter a pontualidade em sessões agendadas, garantindo a confiança e a satisfação dos clientes. 
    Por favor, reveja e ajuste suas práticas para assegurar uma experiência positiva para todos.`,

    `Prezado colaborador, é vital manter a confidencialidade e a ética em todas as interações com clientes. 
    Recebemos relatos de informações sensíveis sendo compartilhadas sem a devida autorização. 
    Reforce a importância desses princípios fundamentais em sua prática diária para preservar a integridade do processo.`,

    `Gostaríamos de chamar a atenção para a necessidade de fornecer feedback construtivo e respeitoso durante as sessões. 
    Recentemente, houve relatos de abordagens que podem ter sido percebidas como inadequadas. 
    Certifique-se de manter uma comunicação positiva e construtiva para promover um ambiente de aprendizado saudável.`,

    `Caro membro da equipe, é essencial continuar investindo em seu desenvolvimento profissional. 
    Notamos uma lacuna na atualização de suas habilidades e conhecimentos recentemente. 
    Recomendamos que participe regularmente de treinamentos e workshops para garantir que sua prática esteja alinhada 
    com as últimas tendências e melhores práticas na área.`,

    `Observamos uma falta de documentação adequada das sessões. 
    A documentação é crucial para avaliar o progresso do cliente e garantir a transparência no processo. 
    Por favor, certifique-se de manter registros precisos e detalhados de cada sessão, 
    conforme estabelecido nas diretrizes internas da empresa e padrões éticos da profissão.`,
];
