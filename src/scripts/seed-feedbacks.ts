/* eslint-disable import/order */
import fs from 'fs';
import AWS from 'aws-sdk';
import AccountsService from 'modules/accounts/service';
import {NotFoundError} from 'modules/errors/errors';
import moment from 'moment';
import _ from 'lodash';

import {BarueriConfig} from '../config';
import {FeedbackProps, FeedbackType} from '../modules/feedbacks/schema';
import FeedbacksService from '../modules/feedbacks/service';
import {AppUser, User} from '../modules/users/schema';
import {SectorsByScenario, filledConfig, getEmployees, getSectors, randomOption, withDateMonkeyPatched} from './utils';

require.extensions['.ejs'] = (m, fileName) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return m._compile(`module.exports=\`${fs.readFileSync(fileName)}\``, fileName);
};

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-feedbacks.ts [ACCOUNT-SUBDOMAIN]');
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

    const account = await AccountsService.config(config, 'seed-feedbacks')
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

            let groups;
            for (let i = 0; i < 12; i++) {
                const date = moment().subtract(i, 'weeks').toISOString();
                groups = ((i % 4) === 0) ? employeesByDistribution(employees, distribution) : groups;
                for (const type of Object.keys(FeedbackType) as FeedbackType[]) {
                    for (const subject of groups[type]) {
                        const employee = randomOption(...employees.filter(e => e.id !== subject.id));
                        const {text} = randomOption(...feedbacks.filter(f => f.type === type));
                        await createFeedback(employee, subject, date, {type, text, sector: subject.sector});
                    }
                }
            }
        }
    }
}

function employeesByDistribution(employees: User[], distribution: typeof Scenarios.LowHappiness) {
    employees = _.shuffle(employees);
    const total = employees.length;
    const compliment = employees.splice(0, Math.floor(distribution[FeedbackType.compliment] * total));
    if (distribution[FeedbackType.compliment] - (compliment.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[FeedbackType.compliment] * 100}% de feedback de elogio`);
    }
    const guidance = employees.splice(0, Math.floor(distribution[FeedbackType.guidance] * total));
    if (distribution[FeedbackType.guidance] - (guidance.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[FeedbackType.guidance] * 100}% de feedback de orientação`);
    }
    const none = employees;
    if (distribution.none - (employees.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution.none * 100}% sem feedback`);
    }

    return {
        [FeedbackType.compliment]: compliment,
        [FeedbackType.guidance]: guidance,
        'none': none,
    };
}

async function createFeedback(employee: User, subject: User, date: string, data: Pick<FeedbackProps, 'type' | 'text' | 'sector'>) {
    const {type} = data;
    console.log('feedback', date.substring(0, 10), type, '>', subject.name);
    if (dry_run) {
        return;
    }
    const service = withDateMonkeyPatched(
        FeedbacksService.config(config, employee as AppUser, employee.account),
        'repository.documents.put',
        date,
    );

    await service
        .create(subject.id, data);
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
    LowProductivity: {[FeedbackType.compliment]: 0.4, [FeedbackType.guidance]: 0.5, 'none': 0.1},
    HighProductivity: {[FeedbackType.compliment]: 0.65, [FeedbackType.guidance]: 0.35, 'none': 0.0},
    LowHappiness: {[FeedbackType.compliment]: 0.2, [FeedbackType.guidance]: 0.6, 'none': 0.2},
    LowManagerSupport: {[FeedbackType.compliment]: 0.25, [FeedbackType.guidance]: 0.35, 'none': 0.4},
    BadClimate: {[FeedbackType.compliment]: 0.3, [FeedbackType.guidance]: 0.4, 'none': 0.3},
};

const feedbacks = [
    {
        type: FeedbackType.guidance,
        text: 'Você demonstrou um excelente compromisso com suas responsabilidades, mas para melhorar, sugerimos buscar mais proatividade na resolução de problemas.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Seu trabalho em equipe é notável, no entanto, para seu desenvolvimento, seria benéfico aprimorar suas habilidades de comunicação para uma interação mais clara e eficaz.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Seu foco no cumprimento de prazos é admirável, porém, é importante equilibrar a velocidade com a precisão para evitar possíveis erros.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Você demonstra grande criatividade em suas tarefas, mas considere explorar diferentes abordagens para encontrar soluções ainda mais inovadoras.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Sua atenção aos detalhes é impressionante, no entanto, sugerimos que amplie sua visão geral para entender melhor o contexto e impacto de suas contribuições.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Sua habilidade em liderança é notável, contudo, para um progresso ainda maior, busque mais feedbacks e esteja aberto a novas perspectivas.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Seu comprometimento com a qualidade é admirável, entretanto, considere gerenciar seu tempo de forma mais eficiente para otimizar seus resultados.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Sua capacidade analítica é forte, porém, para um crescimento contínuo, explore oportunidades para desenvolver suas habilidades interpessoais.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Sua adaptabilidade é uma grande vantagem, no entanto, busque um equilíbrio entre flexibilidade e estabilidade para uma abordagem mais consistente.',
    },
    {
        type: FeedbackType.guidance,
        text: 'Sua capacidade de tomar decisões é impressionante, porém, para um aprimoramento, considere buscar uma análise mais aprofundada de dados antes de decidir.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Seu comprometimento com a qualidade do trabalho é excepcional, demonstrando consistência e precisão em todas as suas tarefas.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Sua habilidade em resolver problemas complexos de forma rápida e eficaz é notável, trazendo soluções inovadoras para os desafios enfrentados.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Você demonstra uma capacidade excepcional de liderança, inspirando e motivando a equipe a alcançar objetivos desafiadores.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Sua criatividade e originalidade são notáveis, trazendo novas perspectivas e ideias valiosas para os projetos em que está envolvido.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Seu compromisso com o aprendizado contínuo é admirável, buscando constantemente maneiras de se aprimorar e crescer profissionalmente.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Sua capacidade de comunicação é excelente, facilitando uma colaboração eficaz e transmitindo suas ideias de maneira clara e concisa.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Você é extremamente confiável e sempre cumpre com suas responsabilidades, sendo um exemplo de dedicação para toda a equipe.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Sua adaptabilidade a novas situações é impressionante, lidando de forma calma e eficiente com mudanças e desafios inesperados.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Seu compromisso em alcançar metas e objetivos é excepcional, mostrando determinação e foco em alcançar resultados de alta qualidade.',
    },
    {
        type: FeedbackType.compliment,
        text: 'Sua ética de trabalho é exemplar, sempre demonstrando profissionalismo e empenho em todas as suas atividades.',
    },
];
