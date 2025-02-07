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
import {AppUser, User} from '../modules/users/schema';
import {
    filledConfig,
    getEmployees,
    getSectors, randomInt,
    randomOption,
    ScenarioKey,
    SectorsByScenario,
} from './utils';
import DynamoClient from 'utils/dynamo-client';
import {ExternalTraining} from '../modules/trainings/schema';
import TrainingProgressesService from '../modules/training-progresses/service';
import TrainingsService from '../modules/trainings/service';
import TrainingTrailsService from '../modules/training-trails/service';
import {TrainingTrail} from 'modules/training-trails/schema';

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-training-progress.ts [ACCOUNT-SUBDOMAIN]');
    process.exit(2);
}

let argc = 2;
const account_subdomain = process.argv[argc++];
const dry_run = false;

AWS.config.region = 'us-east-1';
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

    const fakeAppUser = {id: 'seed-script', ability: {cannot: () => false}} as unknown as AppUser;
    const trainings = await TrainingsService.config(config, fakeAppUser, account.id)
        .listByAccount();
    console.log('# trainings', trainings.length);

    const trails = await TrainingTrailsService.config(config, fakeAppUser, account.id)
        .listByAccount();
    console.log('# trails', trails.length);

    for (const scenario of Object.keys(SectorsByScenario)) {
        const sectors = SectorsByScenario[scenario as ScenarioKey];
        const distribution = TrainingsScenarios[scenario as ScenarioKey];

        console.log(scenario, sectors.length, 'setores (', JSON.stringify(distribution), ')');

        for (const sectorName of sectors) {
            const sector = allSectors.find(s => s.name.toLowerCase() === sectorName.toLowerCase());
            if (!sector) {
                throw new NotFoundError(`Sector "${sectorName}" not found`);
            }
            const employees = allEmployees.filter(e => e.sector === sector.id);
            console.log(`Sector ${sector.name}: ${employees.length} employees`);

            const months = [0, 1, 2].map(i => moment().subtract(i, 'month').toISOString());

            const groups = employeesByDistribution(employees, distribution);
            for (const [status, subjects] of Object.entries(groups)) {
                for (const subject of subjects) {
                    const date = randomOption(...months);
                    console.log('###', scenario, sector.name, date, status, subject.name);
                    const employeeTrailsList = employeeTrails(trails, subject);
                    console.log('### Employee trails', employeeTrailsList.length);
                    if (status !== 'todo') {
                        const trail = randomOption(...employeeTrailsList);
                        const count = status === 'done' ? trail.trainings.length : randomInt(1, trail.trainings.length);
                        await Promise.all(trail.trainings.map((id, index) => createTrainingProgress(
                            subject,
                            trainings.find(t => t.id === id) as ExternalTraining,
                            date,
                            index < count,
                        )));
                    }
                }
            }
        }
    }
}

function employeesByDistribution(employees: User[], distribution: ScenarioConfig) {
    employees = _.shuffle(employees);
    const total = employees.length;

    const done = employees.splice(0, Math.floor(distribution.done * total));
    if (distribution.done - (done.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution.done * 100}% de treinamentos finalizados`);
    }

    const doing = employees.splice(0, Math.floor(distribution.doing * total));
    if (distribution.doing - (doing.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution.doing * 100}% de treinamentos em progresso`);
    }

    const todo = employees;
    if (distribution.todo - (todo.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution.todo * 100}% de treinamentos a iniciar`);
    }

    return {done, doing, todo};
}

async function createTrainingProgress(employee: User, training: ExternalTraining, date: string, done = true) {
    if (dry_run) {
        return;
    }

    const progress = done ? 10000 : 0;
    const fakeAppUser = {...employee, ability: {cannot: () => false}} as unknown as AppUser;
    const service = TrainingProgressesService.config(config, fakeAppUser, employee.account);
    const item = await service
        .retrieveOrCreate(employee.id, training.id);
    const topics = Object.fromEntries(training.topics.map(t => [t.id, {progress}]));
    await new DynamoClient({debug: false, isLocal: false}).put({
        TableName: config.trainingProgressesTable,
        Item: {
            ...item,
            topics,
            _employee_training: `${employee.id}:${training.id}`,
            progress,
            created_at: date,
            updated_at: date,
        },
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

const employeeTrails = (trails: TrainingTrail[], employee: User) => {
    return trails
        .filter(trail => trail.ranks?.length === 0 || (employee.rank && trail.ranks?.includes(employee.rank)))
        .filter(trail => !trail.sectors || trail.sectors.length === 0 || Object.keys(employee.sectors || {}).some(key => trail.sectors.includes(key)))
        .filter(trail => !trail.roles || trail.roles.length === 0 || checkEmployeeRoles(trail.roles, employee))
        .filter(trail => !trail.employee || trail.employee?.length === 0 || trail.employee.includes(employee.id));
};

const checkEmployeeRoles = (trainingTrailRoles: string[], employee: Omit<User, 'password'>) => {
    if (!trainingTrailRoles?.length) {
        return false;
    }

    const employeeRoles: string[] = [employee.roles];
    const isManager: boolean = employee.sectors
        && Object.keys(employee.sectors).some(sector => employee.sectors[sector].is_manager);

    if (isManager) {
        employeeRoles.push('manager');
    }

    return trainingTrailRoles.some(r => employeeRoles.includes(r));
};

type ScenarioConfig = {
    'done': number;
    'doing': number;
    'todo': number;
};

const TrainingsScenarios = {
    LowProductivity: {'done': 0.40, 'doing': 0.30, 'todo': 0.30},
    HighProductivity: {'done': 0.80, 'doing': 0.15, 'todo': 0.05},
    LowHappiness: {'done': 0.30, 'doing': 0.20, 'todo': 0.50},
    LowManagerSupport: {'done': 0.30, 'doing': 0.30, 'todo': 0.40},
    BadClimate: {'done': 0.20, 'doing': 0.40, 'todo': 0.40},
};
