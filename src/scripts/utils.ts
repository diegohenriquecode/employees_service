import AWS from 'aws-sdk';
import knex from 'knex';
import get from 'lodash/get';
import set from 'lodash/set';
import OrgChartsService from 'modules/orgchart/service';

import {BarueriConfig} from '../config';
import {ROOT_ID} from '../modules/orgchart/repository';
import {Sector} from '../modules/orgchart/schema';
import {AppUser, User} from '../modules/users/schema';
import DynamoClient from '../utils/dynamo-client';

export async function filledConfig() {
    const {Functions} = await new AWS.Lambda().listFunctions().promise();
    const {Environment} = await new AWS.Lambda()
        .getFunctionConfiguration({FunctionName: Functions?.[0].FunctionName as string}).promise();

    const Env = Environment?.Variables as AWS.Lambda.EnvironmentVariables;

    const local = false;
    return {
        local,
        debug: false,
        stage: 'v1',
        apiBaseUrl: `${local ? 'http' : 'https'}://${Env.API_DOMAIN}/${Env.STAGE}`,
        fallbackSubdomain: Env.FALLBACK_ACCOUNT_SUBDOMAIN,
        errorsTopic: Env.ERRORS_TOPIC_ARN,
        mainTopic: Env.EVENTS_TOPIC_ARN as string,
        internalApiKey: Env.INTERNAL_API_KEY,
        debugMailAddress: Env.DEBUG_EMAIL_ADDR as string,
        authEmailSource: Env.AUTH_EMAIL_SOURCE as string,
        notificationsEmailSource: Env.NOTIFICATIONS_EMAIL_SOURCE as string,
        mailAssetsUrl: `https://${Env.ASSETS_BASE_URL}`,
        appBaseUrlMask: `https://${Env.APP_DOMAIN}`,
        protectedBucketName: Env.PROTECTED_BUCKET_NAME as string,

        appClientId: Env.APP_CLIENT_ID,
        adminClientId: Env.ADMIN_CLIENT_ID,
        mysql: {
            host: Env.MYSQL_HOST,
            database: Env.MYSQL_DATABASE,
            port: Env.MYSQL_PORT,
            user: Env.MYSQL_USER,
            password: Env.MYSQL_PASSWORD,
            debug: Env.DEBUG === 'true',
        },
        latePeriod: Number(Env.LATE_PERIOD) as number,
        publicBucketName: Env.PUBLIC_BUCKET_NAME as string,
        publicAssetsUrl: `https://${Env.PUBLIC_ASSETS_BASE_URL}`,
        tokyo: {
            yokohamaUrl: Env.TOKYO_YOKOHAMA_BASE_URL as string,
            osakaUrl: Env.TOKYO_OSAKA_BASE_URL as string,
            apiKey: Env.TOKYO_API_KEY as string,
            osakaWebhookKey: Env.TOKYO_OSAKA_WEBHOOK_KEY as string,
        },

        deadLettersTable: 'BarueriDeadLetters',
        eventsTable: 'BarueriMainTopicEvents',
        adminsTable: 'BarueriAdmins',
        adminsByEmail: 'BarueriAdminsByEmail',
        sessionsTable: 'BarueriPasswordSessionsTable',
        tokensTable: 'BarueriTokensTable',
        usersByEmail: 'BarueriUsersByEmail',
        usersByMobilePhone: 'BarueriUsersByMobilePhone',
        usersByUsername: 'BarueriUsersByUsername',
        usersTable: 'BarueriUsers',
        usersSectorsTable: 'BarueriUsersSectors',
        usersMysqlTable: 'BarueriUsers',
        usersUpdateHistoryTable: 'BarueriUsersUpdateHistory',
        orgSectorsTable: 'BarueriOrgSectors',
        orgSectorsByPath: 'BarueriOrgSectorsByPath',
        climateChecksTable: 'BarueriClimateChecksTable',
        climateCheckHistoryTable: 'BarueriClimateCheckHistoryTable',
        climateCheckAssiduityTable: 'BarueriClimateCheckAssiduityTable',
        feedbacksTable: 'BarueriFeedbacks',
        newsFeedTable: 'BarueriNewsFeeds',
        newsFeedCommentsTables: 'BarueriNewsFeedComments',
        feedbacksMysqlTable: 'BarueriFeedbacks',
        coachingRegistersTable: 'BarueriCoachingRegisters',
        coachingRegistersMySqlTable: 'BarueriCoachingRegisters',
        accountsTable: 'BarueriAccounts',
        accountsBySubdomain: 'BarueriAccountsBySubdomain',
        asyncTasksByAccountAndId: 'BarueriAsyncTasksByAccountAndId',
        ranksTable: 'BarueriRanks',
        ranksByTitle: 'BarueriRanksByTitle',
        evaluationsTable: 'BarueriEvaluations',
        evaluationsMysqlTable: 'BarueriEvaluations',
        pendingActionsTable: 'BarueriPendingActions',
        pendingActionsByAccountAndDate: 'BarueriPendingActionsByAccountAndDate',
        pendingActionsByAccountAndId: 'BarueriPendingActionsByAccountAndId',
        timelinesTable: 'BarueriTimelines',
        timelinesByAccountAndId: 'BarueriTimelinesByAccountAndId',
        reprimandsTable: 'BarueriReprimands',
        reprimandsMysqlTable: 'BarueriReprimands',
        suspensionsTable: 'BarueriSuspensions',
        suspensionsMysqlTable: 'BarueriSuspensions',
        evaluationsSchedulerTable: 'BarueriEvaluationsScheduler',
        evaluationsSchedulersByStatus: 'BarueriEvaluationsSchedulerByStatus',
        vacationsTable: 'BarueriVacations',
        templatesTable: 'BarueriTemplates',
        templatesByAccountAndType: 'BarueriTemplatesByAccountAndType',
        notesTable: 'BarueriNotes',
        faqTable: 'BarueriFaq',
        onboardingTable: 'BarueriOnboarding',
        unseenItemsTable: 'BarueriUnseenItems',
        trainingsTable: 'BarueriTrainings',
        trainingTrailsTable: 'BarueriTrainingTrails',
        trainingProgressesTable: 'BarueriTrainingProgresses',
        dismissInterviewsTable: 'BarueriDismissInterviews',
        dismissInterviewsMysqlTable: 'BarueriDismissInterviews',
        videosTable: 'BarueriVideos',
        videoByTokyo: 'BarueriVideosByTokyoId',
        contentsTable: 'BarueriContents',
        sessionsReportsTable: 'BarueriSessionsReportsTable',
        asyncTasksTable: 'BarueriAsyncTasksTable',
    } as BarueriConfig;
}

export function randomInt(from: number, to: number): number {
    return Math.round(Math.random() * (to - from)) + from;
}

export function randomFloat(from: number, to: number): number {
    return Number(((Math.random() * (to - from)) + from).toFixed(2));
}

export function randomOption<T>(...options: T[]): T {
    return options[randomInt(0, options.length - 1)];
}

export function drawn(probability: number) {
    return Math.random() < probability;
}

export function withDateMonkeyPatched<T extends object>(service: T, path: string, date: string): T {
    const holder = path.split('.').slice(0, -1).join('.');
    const original = get(service, path) as unknown as (arg: unknown) => unknown;
    set(service, path, function (params: object) {
        set(params, 'Item.created_at', date);
        set(params, 'Item.updated_at', date);
        return original.call(get(service, holder), params);
    });
    return service;
}

export function boss_of(employee: User, sectors: Record<string, Sector>, employees: Record<string, User>): User | null {
    const mainRelation = employee.sectors[employee.sector];
    if (mainRelation.is_manager && employee.sector === ROOT_ID) {
        return null;
    }

    const bossSector = sectors[mainRelation.subordinate_to];
    if (!bossSector) {
        return null;
    }
    return employees[bossSector.manager as string];
}

export async function getEmployees(config: BarueriConfig, accountId: string, enabledOnly = false) {
    const {Items} = await new DynamoClient({debug: false, isLocal: false})
        .queryAll({
            TableName: config.usersTable,
            KeyConditionExpression: '#hash = :hash',
            ExpressionAttributeNames: {'#hash': 'account'},
            ExpressionAttributeValues: {':hash': accountId},
        });

    const employees = Items as User[];
    return enabledOnly
        ? employees.filter(e => !e.disabled)
        : employees;
}

export async function getSectors(config: BarueriConfig, accountId: string) {
    const {Items} = await new DynamoClient({debug: false, isLocal: false})
        .queryAll({
            TableName: config.orgSectorsTable,
            KeyConditionExpression: '#hash = :hash',
            ExpressionAttributeNames: {'#hash': 'account'},
            ExpressionAttributeValues: {':hash': accountId},
        });

    return Items as Sector[];
}

export function getDB(config: BarueriConfig) {
    return knex({
        client: 'mysql',
        connection: {
            host: config.mysql.host,
            port: parseInt(config.mysql.port as string, 10),
            database: config.mysql.database,
            user: config.mysql.user,
            password: config.mysql.password,
            charset: 'utf8mb4',
        },
    });
}

export async function getEvaluationResponsible(config: BarueriConfig, sector: Sector, subjectIsManager: boolean, account: string) {
    return (await OrgChartsService.config(config, {id: 'teste'} as AppUser, account)
        .managersSectorFor(sector, subjectIsManager)).manager;
}

export const Scenarios = {
    LowProductivity: 'LowProductivity',
    HighProductivity: 'HighProductivity',
    LowHappiness: 'LowHappiness',
    LowManagerSupport: 'LowManagerSupport',
    BadClimate: 'BadClimate',
};

export type ScenarioKey = keyof typeof Scenarios;

export const SectorsByScenario: Record<ScenarioKey, string[]> = {
    LowProductivity: [
        'Financeiro',
        'Suprimentos',
        'Transporte e Frota',
        'Gestão de riscos',
        'Assessoria jurídica',
        'Compras internacionais',
        'Mídia ON',
        'Vendas externas',
        'Vendas e marketing',
        'Infraestrutura',
    ],
    HighProductivity: [
        'Marketing',
        'Relações públicas',
        'Mídia Off',
        'Negociação de contratos',
        'Auditoria',
        'Contabilidade',
        'Impostos e compliance',
        'Contratos e acordos',
        'Gestão de fornecedores',
        'Projetos',
        'Gestão de recursos',
        'Recursos humanos',
        'Desenvolvimento Organizacional',
        'Seleção e entrevistas',
        'Redes sociais',
        'Desenvolvimento de software',
        'Atendimento ao cliente',
        'Gestão de pagamentos',
    ],
    LowHappiness: [
        'Logística de vendas',
        'Vendas',
        'Qualidade',
        'Inovação',
        'Benefícios e remuneracão',
        'Recrutamento internacional',
        'Tesouraria',
        'Compras',
    ],
    LowManagerSupport: [
        'Operações',
        'Arquitetura de sistemas',
        'Tecnologia',
        'Vendas online',
        'Desenvolvimento de hardware',
        'Jurídico',
    ],
    BadClimate: [
        'Desenvolvimento',
        'Segurança da informação',
        'Vendas internas',
        'Televisão',
        'Presidência',
        'Logística',
        'Jurídico',
        'Armazenamento',
        'Gestão de materiais',
    ],
};
