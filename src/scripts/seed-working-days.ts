/* eslint-disable import/order */
import fs from 'fs';
import AWS from 'aws-sdk';
import AccountsService from 'modules/accounts/service';
import {NotFoundError} from 'modules/errors/errors';

import {BarueriConfig} from '../config';
import {filledConfig, getDB, getEmployees} from './utils';
import set from 'lodash/set';
import UsersService from 'modules/users/service';
import {Knex} from 'knex';
import {User} from 'modules/users/schema';

require.extensions['.ejs'] = (m, fileName) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return m._compile(`module.exports=\`${fs.readFileSync(fileName)}\``, fileName);
};

if (process.argv.length !== 3) {
    console.warn('Usage: AWS_PROFILE=my-profile ts-node -T src/scripts/seed-working-days.ts [ACCOUNT-SUBDOMAIN]');
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

    const account = await AccountsService.config(config, 'seed-working-days')
        .findBySubdomain(account_subdomain);
    if (!account) {
        throw new NotFoundError(`Conta "${account_subdomain}" não encontrada`);
    }

    const allEmployees = await getEmployees(config, account.id, true);
    console.log('# employees', allEmployees.length);

    const boss = allEmployees.find(x => x.roles === 'rh');

    for (const employee of allEmployees) {
        const working_days = setWorkingDays();

        console.log('*** atualizando employee: ', employee.name, ' ***');
        await updateEmployee(employee.id, {working_days}, employee.account, boss as User);
    }
}

async function updateEmployee(employeeId: string, patch: Partial<User>, account: string, boss: User) {
    if (dry_run) {
        return;
    }

    await set(UsersService.config(config, boss, account), 'repository.mysql._db', db).update(employeeId, patch);
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

const setWorkingDays = () => {
    return {
        '0': {
            active: true,
            start: '08:00',
            end: '18:00',
        },
        '1': {
            active: true,
            start: '08:00',
            end: '18:00',
        },
        '2': {
            active: true,
            start: '08:00',
            end: '18:00',
        },
        '3': {
            active: true,
            start: '08:00',
            end: '18:00',
        },
        '4': {
            active: true,
            start: '08:00',
            end: '18:00',
        },
        '5': {
            active: false,
            start: null,
            end: null,
        },
        '6': {
            active: false,
            start: null,
            end: null,
        },
    };
};
