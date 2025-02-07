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
import moment, {Moment} from 'moment';
import _ from 'lodash';

import {BarueriConfig} from '../config';
import {SectorsByScenario, filledConfig, getEmployees, getEvaluationResponsible, getSectors, randomInt, randomOption} from './utils';
import {AppUser, User} from 'modules/users/schema';
import CoachingRegistersService from 'modules/coaching-registers/service';
import DynamoClient from 'utils/dynamo-client';

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-coaching-process.ts [ACCOUNT-SUBDOMAIN]');
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

    const account = await AccountsService.config(config, 'seed-coaching-process')
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

            const months = [
                moment(),
                moment().subtract(1, 'month'),
                moment().subtract(2, 'month'),
            ];

            for (let i = 0; i < groups.length; i++) {
                const subject = groups[i].employee;
                const status = groups[i].status;
                const date = months[i % 3];

                const employeeId = await getEvaluationResponsible(config, sector, subject.sectors[sector.id].is_manager, account.id);
                const employee = allEmployees.find(e => e.id === employeeId) || subject;
                await createCoachingProcess(
                    employee,
                    subject,
                    date,
                    randomOption(...current_states),
                    randomOption(...intended_states),
                    generateTodos(date, randomInt(2, 3)),
                    status,
                );
            }
        }
    }
}

function employeesByDistribution(employees: User[], distribution: typeof Scenarios.LowHappiness) {
    employees = _.shuffle(employees);
    const total = employees.length;
    const concluded = employees.splice(0, Math.floor(distribution['concluded'] * total));
    if (distribution['concluded'] - (concluded.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution['concluded'] * 100}% de processo de coaching concluídos`);
    }

    const inProgress = employees.splice(0, Math.floor(distribution['inProgress'] * total));
    if (distribution['inProgress'] - (inProgress.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution['inProgress'] * 100}% de processo de coaching em andamento`);
    }

    return [
        ...concluded.map(c => ({employee: c, status: 'concluded'})),
        ...inProgress.map(c => ({employee: c, status: 'inProgress'})),
    ];
}

async function createCoachingProcess(boss: User, subject: User, date: Moment, current_state: string, intended_state: string, todos: any[], status: string) {
    console.log('Coaching process', date.format('DD/MM/YYYY'), '>', subject.name);

    if (dry_run) {
        return;
    }

    const service = CoachingRegistersService.config(config, boss as AppUser, boss.account);
    const coachingRegister = await service.create(subject.id, {current_state, intended_state, todos, sector: subject.sector});

    if (status === 'concluded') {
        todos = coachingRegister.todos.map(todo => ({
            ...todo,
            completed: true,
            completed_at: date.toISOString(),
        }));
    }

    const Item = {
        ...coachingRegister,
        created_at: date.toISOString(),
        read: status === 'concluded',
        read_at: date.toISOString(),
        updated_at: date.toISOString(),
        todos,
        _employee_id: `${subject.id}:${coachingRegister.id}`,
    };

    await new DynamoClient({
        debug: false,
        isLocal: false,
    }).put({TableName: config.coachingRegistersTable, Item});

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
    LowProductivity: {'concluded': 0.45, 'inProgress': 0.55, 'none': 0},
    HighProductivity: {'concluded': 0.35, 'inProgress': 0.20, 'none': 0.45},
    LowHappiness: {'concluded': 0, 'inProgress': 0.40, 'none': 0},
    LowManagerSupport: {'concluded': 0, 'inProgress': 0.30, 'none': 0.7},
    BadClimate: {'concluded': 0, 'inProgress': 0.40, 'none': 0},
};

const current_states = [
    'O colaborador está se sentindo perdido e desmotivado, sem clareza sobre seus objetivos.',
    'O colaborador está enfrentando dificuldades pessoais que estão afetando negativamente seu desempenho no coaching.',
    'O colaborador está resistente às sugestões e feedbacks do coach, mostrando falta de comprometimento.',
    'O colaborador expressou uma mentalidade fixa e está relutante em explorar novas abordagens ou perspectivas.',
    'O colaborador está demonstrando uma falta de progresso significativo em relação às metas estabelecidas.',
];

const intended_states = [
    'O colaborador está altamente comprometido e motivado, contribuindo de forma proativa para o sucesso da equipe.',
    'O colaborador demonstra habilidades de liderança e é um modelo para seus colegas de equipe.',
    'O colaborador está engajado em desenvolver constantemente suas habilidades e conhecimentos para melhorar seu desempenho.',
    'O colaborador mantém um equilíbrio saudável entre vida pessoal e trabalho, resultando em alto nível de energia e produtividade.',
    'O colaborador está alcançando consistentemente e até mesmo superando suas metas, demonstrando excelência em suas responsabilidades.',
];

const generateTodos = (date: Moment, quantity: number) => {
    let todos = [
        {
            how: 'Selecionando livros relevantes para os objetivos de desenvolvimento pessoal, fazendo anotações e refletindo sobre o conteúdo lido.',
            how_much: 'O investimento será variável, dependendo se os livros são comprados, emprestados ou acessados digitalmente.',
            what: 'Estabelecimento do hábito de leitura regular de livros de diversos gêneros.',
            when: moment(date).add(1, 'month').toISOString(),
            where: 'A leitura pode ser feita em casa, durante o transporte público, ou em qualquer lugar tranquilo e confortável.',
            who: 'A pessoa interessada em melhorar seu desenvolvimento pessoal.',
            why: 'Para expandir conhecimentos, desenvolver habilidades cognitivas e ganhar novas perspectivas sobre diferentes assuntos.',
        },
        {
            how: 'Seguindo técnicas de meditação guiada ou prática livre, focando na respiração e na observação dos pensamentos sem julgamento.',
            how_much: 'Não há custo associado à prática de meditação, sendo uma atividade acessível para o desenvolvimento pessoal.',
            what: 'Estabelecimento de uma rotina diária de meditação para promover o bem-estar mental e emocional.',
            when: moment(date).add(2, 'month').toISOString(),
            where: 'A meditação pode ser feita em casa, em um local tranquilo e livre de distrações.',
            who: 'A pessoa interessada em aprimorar sua saúde mental e emocional.',
            why: 'Para reduzir o estresse, aumentar a clareza mental, e cultivar a atenção plena e a paz interior.',
        },
        {
            how: 'Selecionando cursos relevantes, definindo metas de aprendizado e dedicando tempo regularmente para estudar e completar as atividades.',
            how_much: 'O custo dos cursos pode variar dependendo da plataforma e dos cursos escolhidos, mas será considerado um investimento no desenvolvimento pessoal.',
            what: 'Inscrição em cursos online relacionados aos interesses e objetivos de desenvolvimento pessoal.',
            when: moment(date).add(3, 'month').toISOString(),
            where: 'Os cursos serão acessados online, permitindo flexibilidade de horário e local de estudo.',
            who: 'A pessoa que busca crescimento pessoal e profissional.',
            why: 'Para adquirir novas habilidades, aprimorar competências profissionais e pessoais, e manter-se atualizado em áreas específicas.',
        },
    ];

    todos = _.shuffle(todos);

    return todos.splice(0, quantity);

};
