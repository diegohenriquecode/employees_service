import {S3} from '@aws-sdk/client-s3';
import {fromIni} from '@aws-sdk/credential-providers';
import {spawn} from 'child_process';
import fs from 'fs';
import _ from 'lodash';

import DynamoClient from '../src/utils/dynamo-client';

if (process.argv.length !== 5) {
    console.warn('Usage: ts-node -T scripts/sync-demo-template.ts [ACCOUNT_SUBDOMAIN|ACCOUNT_ID] [FROM-AWS-PROFILE] [TO-AWS-PROFILE]');
    process.exit(2);
}

let argc = 2;
const account_domain_or_id = process.argv[argc++];
const from = process.argv[argc++];
const to = process.argv[argc++];
const region = 'us-east-1';
const outDir = '/tmp/template-dump';

async function main() {
    const documents = new DynamoClient({region, credentials: fromIni({profile: from})});

    const [
        {Item: byId},
        {Items: [byDomain] = []},
    ] = await Promise.all([
        documents.get({TableName: 'BarueriAccounts', Key: {id: account_domain_or_id}}),
        documents.query({TableName: 'BarueriAccounts', IndexName: 'BarueriAccountsBySubdomain', KeyConditionExpression: '#h = :h', ExpressionAttributeNames: {'#h': 'subdomain'}, ExpressionAttributeValues: {':h': account_domain_or_id}}),
    ]);

    const account = byId || byDomain;
    if (!account) {
        throw new Error(`Conta "${account_domain_or_id}" não encontrada`);
    }

    fs.mkdirSync(`${outDir}/tables`, {recursive: true});

    console.log('Account', account.name);

    const meta: Record<string, unknown> = {};
    for (const TableName of TableNames) {
        const {Items} = await documents.queryAll({
            TableName,
            KeyConditionExpression: '#hash = :hash',
            ExpressionAttributeNames: {'#hash': 'account'},
            ExpressionAttributeValues: {':hash': account.id},
        });

        console.log(TableName, Items.length);
        if (TablesToMeta.includes(TableName)) {
            meta[TableName] = {
                lastDate: Items
                    .reduce((date, item) => _.max([date, item.updated_at || item.created_at]), ''),
            };
        }
        const json = JSON.stringify(Items, null, 2)
            .replaceAll(account.id, '${ACCOUNT_ID}');
        fs.writeFileSync(`${outDir}/tables/${TableName}.json`, json, {encoding: 'utf8'});
    }

    const accountJson = JSON.stringify({...account, meta}, null, 2)
        .replaceAll(account.id, '${ACCOUNT_ID}');
    fs.writeFileSync(`${outDir}/tables/BarueriAccount.json`, accountJson, {encoding: 'utf8'});

    const {Buckets: FromBuckets = []} = await new S3({credentials: fromIni({profile: from})})
        .listBuckets({});
    const protectedBucket = FromBuckets.find(b => b.Name?.includes('protected'))?.Name;
    if (!protectedBucket) {
        throw new Error('Bucket privado (origem) não encontrado');
    }
    const publicBucket = FromBuckets.find(b => b.Name?.includes('public'))?.Name;
    if (!publicBucket) {
        throw new Error('Bucket públíco (origem) não encontrado');
    }

    const folders = [
        `s3://${protectedBucket}/contents/${account.id}`,
        `s3://${protectedBucket}/employees/${account.id}`,
        `s3://${publicBucket}/trainings/${account.id}`,
        `s3://${publicBucket}/training-trails/${account.id}`,
        `s3://${publicBucket}/accounts/${account.id}`,
        `s3://${protectedBucket}/reprimands/${account.id}`,
        `s3://${protectedBucket}/suspensions/${account.id}`,
    ];

    for (const src of folders) {
        const dst = [outDir, 'files', src.split('/').at(-2)].join('/');
        const cmd = `s3 sync --profile ${from} --delete ${src} ${dst}`;
        console.log(cmd);
        await call('aws', cmd.split(' '));
    }

    const {Buckets: ToBuckets = []} = await new S3({credentials: fromIni({profile: to})})
        .listBuckets({});
    const bucket = ToBuckets.find(b => b.Name?.includes('protected'))?.Name;
    if (!bucket) {
        throw new Error('Bucket privado (destino) não encontrado');
    }

    const upCmd = `s3 sync --profile ${to} --delete ${outDir} s3://${bucket}/template-demo`;
    console.log(upCmd);
    await call('aws', upCmd.split(' '));
}

const TableNames = [
    'BarueriRanks',
    'BarueriOrgSectors',
    'BarueriUsers',
    'BarueriContents',
    'BarueriTrainings',
    'BarueriTrainingTrails',
    'BarueriTrainingProgresses',
    'BarueriNewsFeeds',
    'BarueriNewsFeedComments',
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

const TablesToMeta = [
    'BarueriFeedbacks',
    'BarueriNewsFeeds',
    'BarueriNewsFeedComments',
    'BarueriEvaluations',
    'BarueriReprimands',
    'BarueriSuspensions',
    'BarueriCoachingRegisters',
    'BarueriTrainingProgresses',
    'BarueriClimateChecksTable',
    'BarueriClimateCheckAssiduityTable',
    'BarueriClimateCheckHistoryTable',
    'BarueriDismissInterviews',
];

async function call(cmd: string, args: string[]) {
    return new Promise((resolve, reject) => {
        const ls = spawn(cmd, args);
        let out = '';
        ls.stdout.on('data', data => {
            out += data.toString();
            console.log(`[${args[0]} stdout]:`, data.toString());
        });
        ls.stderr.on('data', data => {
            console.log(`[${args[0]} stderr]:`, data.toString());
        });
        ls.on('error', (error) => {
            reject(error);
        });
        ls.on('close', code => {
            if (code === 0) {
                resolve(out);
            }
        });
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
