import {NoSuchKey, S3} from '@aws-sdk/client-s3';
import {Context, SQSEvent} from 'aws-lambda';
import {chunk} from 'lodash';
import {InternalError} from 'modules/errors/errors';
import {User} from 'modules/users/schema';
import moment from 'moment';
import {S3SyncClient} from 's3-sync-client';
import {DDBStreamEvent} from 'utils/dynamo-client';
import DynamoClient from 'utils/dynamo-client';
import subscriptionHandler from 'utils/subscriptions';

import config from '../../config';
import {Account, AccountStatus} from './schema';
import AccountsService from './service';

export const handler = (event: SQSEvent, context: Context) => subscriptionHandler<DDBStreamEvent<Account>>(event, context, _handler);

async function _handler(payload: DDBStreamEvent<Account>) {
    const {NewItem: account} = payload;
    if (account && payload.EventType === 'INSERT' && account.is_demo) {

        const accountJson = await s3.getObject({
            Bucket: config.protectedBucketName,
            Key: importTablePath('BarueriAccount'),
            ResponseContentType: 'application/json',
        });

        const accountFromS3 = await accountJson.Body?.transformToString('utf-8');

        if (!accountFromS3) {
            throw new InternalError('No account base data');
        }

        const accountObj = JSON.parse(accountFromS3);

        const now = moment();

        const TableNames = [
            'BarueriRanks',
            'BarueriOrgSectors',
            'BarueriUsers',
            'BarueriContents',
            'BarueriTrainings',
            'BarueriTrainingTrails',
            'BarueriTrainingProgresses',
            'BarueriFeedbacks',
            'BarueriEvaluations',
            'BarueriReprimands',
            'BarueriSuspensions',
            'BarueriCoachingRegisters',
            'BarueriClimateChecksTable',
            'BarueriClimateCheckAssiduityTable',
            'BarueriClimateCheckHistoryTable',
            'BarueriDismissInterviews',
        ];

        for (const tableName of TableNames) {
            let json;
            try {
                json = await s3.getObject({
                    Bucket: config.protectedBucketName,
                    Key: importTablePath(tableName),
                    ResponseContentType: 'application/json',
                });
            } catch (e) {
                if (e instanceof NoSuchKey) {
                    console.warn(`Table file not found: ${tableName}`);
                    continue;
                }
                throw e;
            }
            const fromS3 = await json.Body?.transformToString('utf-8');

            let diff = null;

            if (accountObj.meta?.[tableName]) {
                diff = now.diff(accountObj.meta[tableName].lastDate, 'd');
            }

            if (fromS3) {
                await _batchCreate(fromS3, tableName, account, diff);
            }
        }

        const protectedResources = ['contents', 'employees', 'reprimands', 'suspensions'];
        const publicResources = ['accounts', 'training-trails', 'trainings'];

        for (const resource of protectedResources) {
            await sync(`s3://${config.protectedBucketName}/template-demo/files/${resource}`, `s3://${config.protectedBucketName}/${resource}/${account.id}`, {del: true});
        }

        for (const resource of publicResources) {
            await sync(`s3://${config.protectedBucketName}/template-demo/files/${resource}`, `s3://${config.publicBucketName}/${resource}/${account.id}`, {del: true});
        }

        await accounts.setStatus(account.id, AccountStatus.ready);
    }
}

const importTablePath = (fileName: string) => `template-demo/tables/${fileName}.json`;

async function _batchCreate(jsonData: string, table: string, account: Account, diff: number | null) {

    const withReplacedAccount = jsonData.replaceAll('${ACCOUNT_ID}', account.id);
    let items: Record<string, unknown>[] = JSON.parse(withReplacedAccount);

    if (items.length === 0) {
        return;
    }

    if (table === 'BarueriUsers') {
        items = (items as User[]).filter(item => item.roles !== 'admin');
    }

    const Items = items
        .map((props) => shifted(table, diff, account.responsible, props));

    const groups = chunk(Items, 25);
    while (groups.length > 0) {
        const group = groups.shift();
        const {UnprocessedItems = {}} = await dynamoClient.batchWrite({
            RequestItems: {
                [table]: group.map(Item => ({
                    PutRequest: {
                        Item,
                    },
                })),
            },
        });
        if (UnprocessedItems[table]?.length > 0) {
            groups.push(UnprocessedItems[table]?.map(i => i.PutRequest?.Item));
        }
    }
}

export function shifted(table: string, diff: null|number, responsible: string, props: Record<string, unknown>) {
    return {
        ...props,
        created_at: !props.created_at ? undefined : (diff !== null ? moment(props.created_at).add(diff, 'd').toISOString() : moment().toISOString()),
        created_by: diff !== null ? props.created_by : responsible,
        updated_at: !props.updated_at ? undefined : (diff !== null ? moment(props.updated_at).add(diff, 'd').toISOString() : moment().toISOString()),
        updated_by: diff !== null ? props.updated_by : responsible,
        finished_at: props.finished_at && diff !== null ? moment(props.finished_at).add(diff, 'd').toISOString() : props.finished_at,
        _DateEmployee: table === 'BarueriClimateChecksTable' && diff !== null ? updateDateEmployee(props._DateEmployee, diff) : props._DateEmployee,
        _SectorDate: table === 'BarueriClimateCheckAssiduityTable' && diff !== null ? updateSectorDate(props._SectorDate, moment(props.date).add(diff, 'd').format('YYYY-MM-DD')) : props._SectorDate,
        _SectorTypeDate: table === 'BarueriClimateCheckHistoryTable' && diff !== null ? updateSectorTypeDate(props._SectorTypeDate, moment(props.date).add(diff, 'd').format('YYYY-MM-DD')) : props._SectorTypeDate,
        date: climateHistories.includes(table) && diff !== null ? moment(props.date).add(diff, 'd').format('YYYY-MM-DD') : props.date,
    };
}

const updateSectorDate = (sectorDate: string, newDate: string) => {
    const splitted = sectorDate.split(':');
    return `${splitted[0]}:${newDate}`;
};

const updateSectorTypeDate = (sectorTypeDate: string, newDate: string) => {
    const splitted = sectorTypeDate.split(':');
    return `${splitted[0]}:${splitted[1]}:${newDate}`;
};

const updateDateEmployee = (dateEmployee: string, diff: number) => {
    const splitted = dateEmployee.split('#');
    return `${moment(splitted[0]).add(diff, 'd').format('YYYY-MM-DD')}#${splitted[1]}#${splitted[2]}#${splitted[3]}`;
};

const climateHistories = ['BarueriClimateCheckAssiduityTable', 'BarueriClimateCheckHistoryTable'];

const accounts = AccountsService.config(config, 'sub-populate-demo-account');
const s3 = new S3({});
const {sync} = new S3SyncClient({client: s3});
const dynamoClient = new DynamoClient({debug: config.debug, isLocal: config.local});
