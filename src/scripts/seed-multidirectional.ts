/* eslint-disable import/order */
require.extensions['.ejs'] = (m, fileName) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return m._compile(`module.exports=\`${fs.readFileSync(fileName)}\``, fileName);
};

import fs from 'fs';
import AWS from 'aws-sdk';
import AccountsService from 'modules/accounts/service';
import {NotFoundError} from 'modules/errors/errors';
import moment from 'moment';
import _ from 'lodash';

import {evaluationResult} from '../modules/evaluations/service-multidirectional';
import {BarueriConfig} from '../config';
import {AppUser, User} from '../modules/users/schema';
import {
    filledConfig,
    getDB,
    getEmployees,
    getSectors,
    randomInt,
    randomOption,
    ScenarioKey,
    SectorsByScenario,
} from './utils';
import {Evaluation, EvaluationMultidirectional, EvaluationStatus, EvaluationType} from 'modules/evaluations/schema';
import EvaluationsService from 'modules/evaluations/service';
import {Account} from 'modules/accounts/schema';
import {Knex} from 'knex';
import {MultidirectionalEvaluation, MultidirectionalEvaluationByType} from 'modules/evaluations/bases';
import DynamoClient from 'utils/dynamo-client';

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-multidirectional.ts [ACCOUNT-SUBDOMAIN]');
    process.exit(2);
}

let argc = 2;
const account_subdomain = process.argv[argc++];
const dry_run = false;

AWS.config.region = 'us-east-1';
let config = {} as BarueriConfig;
let db: Knex;

async function main() {
    if (dry_run) {
        console.warn('******* DRYRUN *******');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    config = await filledConfig();

    db = getDB(config);

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
        const sectors = SectorsByScenario[scenario as ScenarioKey];
        const scenarioConfig = MultidirectionalScenarios[scenario as ScenarioKey];

        for (const type of Object.keys(scenarioConfig)) {
            const distribution = scenarioConfig[type as keyof typeof scenarioConfig];
            console.log(scenario, `(${type}) :`, sectors.length, 'setores (', JSON.stringify(distribution), ')');

            for (const sectorName of sectors) {
                const sector = allSectors.find(s => s.name.toLowerCase() === sectorName.toLowerCase());
                if (!sector) {
                    throw new NotFoundError(`Sector "${sectorName}" not found`);
                }
                const employees = allEmployees.filter(e => e.sector === sector.id);
                console.log(`Sector ${sector.name}: ${employees.length} employees`);

                for (let i = 0; i < 3; i++) {
                    const date = moment().subtract(i, 'month').toISOString();
                    const groups = employeesByDistribution(employees, distribution);
                    for (const [region, subjects] of Object.entries(groups)) {
                        for (const subject of subjects) {
                            console.log('###', scenario, type, sector.name, date, region, subject.name);
                            const creator = randomOption(...employees.filter(e => e.roles === 'rh' && e.id !== subject.id));
                            await createMultidirectional(subject, MultidirectionalEvaluationByType[type], region as RegionNames, creator, date, account);
                        }
                    }
                }
            }
        }
    }
}

type RegionNames = keyof MultidirectionalEvaluation['regions'];

function employeesByDistribution(employees: User[], distribution: ScenarioConfig) {
    employees = _.shuffle(employees);
    const total = employees.length;

    return Object.entries(distribution)
        .sort(([, val1], [, val2]) => val1 - val2)
        .map(([name, val], i, {length}) => {
            const quantity = (i === length - 1) ? employees.length : Math.floor(val * total);
            const items = employees.splice(0, quantity);
            if (val - (items.length / total) > 0.05) {
                console.warn(`${total} não é suficiente para satisfazer ${val * 100}% na região '${name}'`);
            }
            return {[name]: items};
        }).reduce((obj, field) => Object.assign(obj, field), {});
}

async function createMultidirectional(employee: User, template: MultidirectionalEvaluation, region: RegionNames, creator: User|null, created_at: string, account: Account) {
    if (dry_run) {
        return;
    }
    const ratio = template.abilitySchema.maximum / template.schema.maximum;
    const regionRange = [Math.ceil(template.regions[region][0] / ratio), Math.floor(template.regions[region][1] / ratio)];

    const evaluations = EvaluationsService.config(config, (creator || {id: 'script'}) as AppUser, account);
    _.set(evaluations, 'usersRepository._db', db);
    _.set(evaluations, 'users.repository.mysql._db', db);
    const evaluation = await evaluations
        .create(employee.id, {
            type: template.type as EvaluationType,
            evaluators: 2,
            deadline: moment(created_at).add(randomInt(5, 10), 'd').toISOString(),
            sector: employee.sector,
        });
    const Item = {
        ...evaluation,
        created_at,
        _employee_id: `${evaluation.employee}:${evaluation.id}`,
    } as EvaluationMultidirectional & Evaluation & {_employee_id: string};
    for (const subeval of Item.evaluations) {
        Object.assign(subeval, {
            answers: template.questions
                .map(q => ({[q.id]: randomInt(regionRange[0], regionRange[1])}))
                .reduce((obj, field) => Object.assign(obj, field), {}),
            status: EvaluationStatus.done,
        });
    }
    const updated_at = moment(created_at)/*.add(randomInt(1, 5), 'd')*/.toISOString();
    Object.assign(Item, evaluationResult(Item, template), {
        updated_at,
        finished_at: updated_at,
        rev: (Item.rev || 0) + 1,
    });
    await new DynamoClient({
        debug: false,
        isLocal: false,
    }).put({TableName: config.evaluationsTable, Item});
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

const MultidirectionalType = {
    ie: 'multidirectional.ie',
    o: 'multidirectional.o',
    hg: 'multidirectional.hg',
    dv: 'multidirectional.dv',
    et: 'multidirectional.et',
};

type ScenarioConfig = {
    'bad': number;
    'median': number;
    'good': number;
};

const MultidirectionalScenarios = {
    LowProductivity: {
        [MultidirectionalType.et]: {'bad': 0.55, 'median': 0.25, 'good': 0.20},
    },
    HighProductivity: {
        [MultidirectionalType.ie]: {'bad': 0.00, 'median': 0.25, 'good': 0.75},
        [MultidirectionalType.et]: {'bad': 0.00, 'median': 0.15, 'good': 0.85},
        [MultidirectionalType.o]: {'bad': 0.00, 'median': 0.20, 'good': 0.80},
    },
    LowHappiness: {
        [MultidirectionalType.ie]: {'bad': 0.80, 'median': 0.00, 'good': 0.20},
        [MultidirectionalType.o]: {'bad': 0.75, 'median': 0.00, 'good': 0.25},
    },
    LowManagerSupport: {
        [MultidirectionalType.hg]: {'bad': 0.00, 'median': 0.20, 'good': 0.80},
    },
    BadClimate: {
        [MultidirectionalType.ie]: {'bad': 0.75, 'median': 0.00, 'good': 0.25},
        [MultidirectionalType.o]: {'bad': 0.55, 'median': 0.00, 'good': 0.45},
        [MultidirectionalType.et]: {'bad': 0.70, 'median': 0.00, 'good': 0.30},
    },
};
