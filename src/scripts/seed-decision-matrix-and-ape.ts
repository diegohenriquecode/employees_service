/* eslint-disable import/order */
import fs from 'fs';
import AWS from 'aws-sdk';
import AccountsService from 'modules/accounts/service';
import {NotFoundError} from 'modules/errors/errors';
import moment from 'moment';
import _ from 'lodash';

import {BarueriConfig} from '../config';
import {MatricesService} from 'modules/evaluations/service-matrix';
import {AppUser, User} from '../modules/users/schema';
import {Scenarios, SectorsByScenario, filledConfig, getDB, getEmployees, getEvaluationResponsible, getSectors, randomFloat, randomInt} from './utils';
import {DecisionMatrixResults, EvaluationDecisionMatrix, EvaluationStatus, EvaluationType} from 'modules/evaluations/schema';
import EvaluationsService from 'modules/evaluations/service';
import {Account} from 'modules/accounts/schema';
import {Knex} from 'knex';
import {APEEvaluation, DecisionsMatrix} from 'modules/evaluations/bases';
import DynamoClient from 'utils/dynamo-client';

require.extensions['.ejs'] = (m, fileName) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return m._compile(`module.exports=\`${fs.readFileSync(fileName)}\``, fileName);
};

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-decision-matrix.ts [ACCOUNT-SUBDOMAIN]');
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
        const distribution = DecisionMatrixScenarios[scenario];
        console.log(scenario, ':', sectors.length, 'setores (', JSON.stringify(distribution), ')');
        for (const sectorName of sectors) {
            const sector = allSectors.find(s => s.name.toLowerCase() === sectorName.toLowerCase());
            if (!sector) {
                throw new NotFoundError(`Sector "${sectorName}" not found`);
            }
            const employees = allEmployees.filter(e => e.sector === sector.id);
            console.log(`Sector ${sector.name}: ${employees.length} employees`);

            let groups;
            for (let i = 0; i < 3; i++) {
                const date = moment().subtract(i, 'month').toISOString();
                groups = employeesByDistribution(employees, distribution);
                const decisionMatrixTypes = [...Object.keys(DecisionMatrixResults), 'created', 'none'];
                for (const type of decisionMatrixTypes as [...DecisionMatrixResults[], 'created', 'none']) {
                    for (const subject of groups[type]) {
                        const employeeId = await getEvaluationResponsible(config, sector, subject.sectors[sector.id].is_manager, account.id);
                        const employee = allEmployees.find(e => e.id === employeeId) || subject;

                        if (type !== 'none') {
                            await createDecisionMatrix(sector.id, type, subject, date, account, employee);
                        } else {
                            await createAPE(sector.id, scenario, subject, date, account, employee);
                        }
                    }
                }
            }
        }
    }
}

function employeesByDistribution(employees: User[], distribution: typeof DecisionMatrixScenarios.LowHappiness) {
    employees = _.shuffle(employees);
    const total = employees.length;
    const resignation = employees.splice(0, Math.floor(distribution[DecisionMatrixResults.resignation] * total));
    if (distribution[DecisionMatrixResults.resignation] - (resignation.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[DecisionMatrixResults.resignation] * 100}% no quadrante demissão`);
    }

    const training = employees.splice(0, Math.floor(distribution[DecisionMatrixResults.training] * total));
    if (distribution[DecisionMatrixResults.training] - (training.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[DecisionMatrixResults.training] * 100}% no quadrante treinamento`);
    }

    const motivation = employees.splice(0, Math.floor(distribution[DecisionMatrixResults.motivation] * total));
    if (distribution[DecisionMatrixResults.motivation] - (motivation.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[DecisionMatrixResults.motivation] * 100}% no quadrante motivação`);
    }

    const observation = employees.splice(0, Math.floor(distribution[DecisionMatrixResults.observation] * total));
    if (distribution[DecisionMatrixResults.observation] - (observation.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[DecisionMatrixResults.observation] * 100}% no quadrante observação`);
    }

    const recognition = employees.splice(0, Math.floor(distribution[DecisionMatrixResults.recognition] * total));
    if (distribution[DecisionMatrixResults.recognition] - (recognition.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[DecisionMatrixResults.recognition] * 100}% no quadrante reconhecimento`);
    }

    const investment = employees.splice(0, Math.floor(distribution[DecisionMatrixResults.investment] * total));
    if (distribution[DecisionMatrixResults.investment] - (investment.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[DecisionMatrixResults.investment] * 100}% no quadrante investimento`);
    }

    const highPerformance = employees.splice(0, Math.floor(distribution[DecisionMatrixResults.highPerformance] * total));
    if (distribution[DecisionMatrixResults.highPerformance] - (highPerformance.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution[DecisionMatrixResults.highPerformance] * 100}% no quadrante alta performance`);
    }

    const created = employees.splice(0, Math.floor(distribution['created'] * total));
    if (distribution.created - (employees.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution.created * 100}% sem resposta`);
    }

    const none = employees;
    if (distribution.none - (employees.length / total) > 0.05) {
        console.warn(`${total} não é suficiente para satisfazer ${distribution.none * 100}% sem matriz de decisão`);
    }

    return {
        [DecisionMatrixResults.highPerformance]: highPerformance,
        [DecisionMatrixResults.resignation]: resignation,
        [DecisionMatrixResults.training]: training,
        [DecisionMatrixResults.motivation]: motivation,
        [DecisionMatrixResults.observation]: observation,
        [DecisionMatrixResults.investment]: investment,
        [DecisionMatrixResults.recognition]: recognition,
        'created': created,
        'none': none,
    };
}

async function createDecisionMatrix(sector: string, type: string, employee: User, created_at: string, account: Account, boss: User) {

    if (dry_run) {
        return;
    }

    const evaluation = await _.set(EvaluationsService.config(config, boss as AppUser, account), 'usersRepository._db', db)
        .create(employee.id, {sector, type: EvaluationType.decision_matrix, deadline: null});

    let Item = {...evaluation};
    if (type === 'created') {
        Object.assign(Item, {
            created_at,
            _employee_id: `${evaluation.employee}:${evaluation.id}`,
            updated_at: created_at,
            rev: (evaluation.rev || 0) + 1,
        });
    } else {
        const updated_at = created_at;
        Item = {
            ...evaluation,
            ...randomByType(type),
        };
        Object.assign(Item, {
            created_at,
            _employee_id: `${evaluation.employee}:${evaluation.id}`,
            ...MatricesService.finish(Item as EvaluationDecisionMatrix),
            daysLate: 0,
            finished_at: updated_at,
            updated_at,
            rev: (evaluation.rev || 0) + 1,
        });
    }
    await new DynamoClient({
        debug: false,
        isLocal: false,
    }).put({TableName: config.evaluationsTable, Item});
}

async function createAPE(sector: string, scenario: string, employee: User, created_at: string, account: Account, boss: User) {

    if (dry_run) {
        return;
    }

    const evaluation = await _.set(EvaluationsService.config(config, boss as AppUser, account), 'usersRepository._db', db)
        .create(employee.id, {sector, type: EvaluationType.ape, deadline: null});

    const updated_at = created_at;
    const Item = {
        ...evaluation,
        ...randomAPEByScenario(scenario),
    };
    Object.assign(Item, {
        created_at,
        _employee_id: `${evaluation.employee}:${evaluation.id}`,
        daysLate: 0,
        finished_at: updated_at,
        updated_at,
        status: EvaluationStatus.done,
        rev: (evaluation.rev || 0) + 1,
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

const DecisionMatrixScenarios = {
    LowProductivity: {[DecisionMatrixResults.resignation]: 0.2, [DecisionMatrixResults.motivation]: 0.4, [DecisionMatrixResults.training]: 0.1, [DecisionMatrixResults.highPerformance]: 0.0, [DecisionMatrixResults.observation]: 0.0, [DecisionMatrixResults.investment]: 0.0, [DecisionMatrixResults.recognition]: 0.0, 'created': 0.0, 'none': 0.3},
    HighProductivity: {[DecisionMatrixResults.resignation]: 0.0, [DecisionMatrixResults.motivation]: 0.0, [DecisionMatrixResults.training]: 0.0, [DecisionMatrixResults.highPerformance]: 0.4, [DecisionMatrixResults.observation]: 0.0, [DecisionMatrixResults.investment]: 0.25, [DecisionMatrixResults.recognition]: 0.25, 'created': 0.0, 'none': 0.1},
    LowHappiness: {[DecisionMatrixResults.resignation]: 0.1, [DecisionMatrixResults.motivation]: 0.3, [DecisionMatrixResults.training]: 0.0, [DecisionMatrixResults.highPerformance]: 0.4, [DecisionMatrixResults.observation]: 0.0, [DecisionMatrixResults.investment]: 0.0, [DecisionMatrixResults.recognition]: 0.35, 'created': 0.0, 'none': 0.25},
    LowManagerSupport: {[DecisionMatrixResults.resignation]: 0.1, [DecisionMatrixResults.motivation]: 0.2, [DecisionMatrixResults.training]: 0.3, [DecisionMatrixResults.highPerformance]: 0.0, [DecisionMatrixResults.observation]: 0.0, [DecisionMatrixResults.investment]: 0.0, [DecisionMatrixResults.recognition]: 0.0, 'created': 0.2, 'none': 0.2},
    BadClimate: {[DecisionMatrixResults.resignation]: 0.1, [DecisionMatrixResults.motivation]: 0.4, [DecisionMatrixResults.training]: 0.2, [DecisionMatrixResults.highPerformance]: 0.0, [DecisionMatrixResults.observation]: 0.0, [DecisionMatrixResults.investment]: 0.0, [DecisionMatrixResults.recognition]: 0.0, 'created': 0.2, 'none': 0.1},
};

function randomByType(type: string) {
    const technicalQuestionsIds = DecisionsMatrix[0].questions.filter(q => q.competency === 'technical');
    const emotionalQuestionsIds = DecisionsMatrix[0].questions.filter(q => q.competency === 'emotional');

    switch (type) {
    case DecisionMatrixResults.highPerformance:
        return {
            technical: {answers: technicalQuestionsIds.map(({id}) => ({id, value: randomFloat(9, 10)}))},
            emotional: {answers: emotionalQuestionsIds.map(({id}) => ({id, value: randomFloat(9, 10)}))},
        };
    case DecisionMatrixResults.investment:
        return {
            technical: {answers: technicalQuestionsIds.map(({id}) => ({id, value: randomFloat(8, 9)}))},
            emotional: {answers: emotionalQuestionsIds.map(({id}) => ({id, value: randomFloat(8, 9)}))},
        };
    case DecisionMatrixResults.recognition:
        return {
            technical: {answers: technicalQuestionsIds.map(({id}) => ({id, value: randomFloat(7, 8)}))},
            emotional: {answers: emotionalQuestionsIds.map(({id}) => ({id, value: randomFloat(7, 8)}))},
        };
    case DecisionMatrixResults.observation:
        return {
            technical: {answers: technicalQuestionsIds.map(({id}) => ({id, value: randomFloat(5, 7)}))},
            emotional: {answers: emotionalQuestionsIds.map(({id}) => ({id, value: randomFloat(5, 7)}))},
        };
    case DecisionMatrixResults.motivation:
        return {
            technical: {answers: technicalQuestionsIds.map(({id}) => ({id, value: randomFloat(5, 10)}))},
            emotional: {answers: emotionalQuestionsIds.map(({id}) => ({id, value: randomFloat(0, 5)}))},
        };
    case DecisionMatrixResults.training:
        return {
            technical: {answers: technicalQuestionsIds.map(({id}) => ({id, value: randomFloat(0, 5)}))},
            emotional: {answers: emotionalQuestionsIds.map(({id}) => ({id, value: randomFloat(5, 10)}))},
        };
    case DecisionMatrixResults.resignation:
        return {
            technical: {answers: technicalQuestionsIds.map(({id}) => ({id, value: randomFloat(0, 5)}))},
            emotional: {answers: emotionalQuestionsIds.map(({id}) => ({id, value: randomFloat(0, 5)}))},
        };
    }
}

function randomAPEByScenario(scenario: string) {

    const notes = () => {
        switch (scenario) {
        case Scenarios.LowProductivity:
            return randomInt(1, 2);
        case Scenarios.HighProductivity:
            return randomInt(3, 4);
        case Scenarios.LowHappiness:
            return randomInt(1, 3);
        case Scenarios.LowManagerSupport:
            return randomInt(1, 4);
        case Scenarios.BadClimate:
            return randomInt(1, 3);
        }
    };

    return {
        criteria: {
            answers: APEEvaluation[0].questions.map((({id}) => ({id, value: notes()}))),
        },
    };

}
