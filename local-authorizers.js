/* eslint-disable @typescript-eslint/no-var-requires */
const {Lambda, InvokeCommand} = require('@aws-sdk/client-lambda');
const get = require('lodash/get');
const template = require('lodash/template');

const accounts = require('./.local/ddb-tables/accounts.json');
const sectors = require('./.local/ddb-tables/sectors.json');
const tokens = require('./.local/ddb-tables/tokens.json');
const users = require('./.local/ddb-tables/users.json');
const roles = require('./src/modules/roles/business-rules');

const service = 'barueri-backend';
const stage = 'offline';

module.exports = {
    async localPrivateAuthByToken(event) {
        const lambda = new Lambda({endpoint: 'http://localhost:8605'});
        event.headers.Origin = 'http://localhost';

        const command = new InvokeCommand({
            FunctionName: `${service}-${stage}-privateAuth`,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(event),
        });
        try {
            const result = await lambda.send(command);
            const decodedPayload = new TextDecoder().decode(result.Payload);
            const payload = JSON.parse(decodedPayload || '{}');

            if ((payload?.statusCode || result.StatusCode) === 200 && !result.FunctionError) {
                return payload;
            }
        } catch (error) {
            console.error('error', error);
        }

        throw Error('Unauthorized');
    },

    async localPrivateAuthByMock() {
        const {account, user, token, rules} = getMockData();
        return {
            context: {
                account: JSON.stringify(account),
                user: JSON.stringify(user),
                token: JSON.stringify(token),
                rules: JSON.stringify(rules),
            },
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Allow',
                        Resource: '*',
                    },
                ],
            },
            principalId: user.id,
        };
    },

    async localPublicAuthByToken(event) {
        const lambda = new Lambda({endpoint: 'http://localhost:8605'});
        event.headers.Origin = 'http://localhost';
        const command = new InvokeCommand({
            FunctionName: `${service}-${stage}-publicAuth`,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(event),
        });

        const result = await lambda.send(command);
        const decodedPayload = new TextDecoder().decode(result.Payload);
        const payload = JSON.parse(decodedPayload);

        if (result.StatusCode === 200) {
            return payload;
        }

        throw Error('Unauthorized');
    },

    async localPublicAuthByMock() {
        const {account} = getMockData();
        return {
            context: {
                account: JSON.stringify(account),
            },
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Allow',
                        Resource: '*',
                    },
                ],
            },
            principalId: 'public',
        };
    },
};

function getRules(account, user) {
    const sector = sectors.find(s => s.id === user.sector);
    const isManager = sector.manager === user.id;
    const {permissions: [...permissions]} = roles.find(role => role.id === user.roles);
    if (isManager) {
        const {permissions: managerPermissions} = roles.find(role => role.id === 'manager');
        permissions.push(...managerPermissions);
        const descendants = sectors.filter(s => s.path.startsWith(s.path));
        sector.descendants = descendants.map(s => s.id);
    }
    return interpolate(JSON.stringify(permissions), {user: {...user, sector}, account});
}

function interpolate(permissions, vars) {
    return JSON.parse(permissions, (_, rawValue) => {
        if (!rawValue?.includes?.('${')) {
            return rawValue;
        }

        const value = (rawValue.startsWith('${') && rawValue.endsWith('}'))
            ? get(vars, rawValue.slice(2, -1))
            : template(rawValue)(vars);

        if (typeof value === 'undefined') {
            throw new ReferenceError(`Value ${rawValue} cannot be resolved`);
        }

        return value;
    });
}

function log(...args) {
    if (process.env.DEBUG === 'true') {
        console.log(...args);
    }
}

function getMockData() {
    const {client_id, user_id, user_roles, ...token} = tokens.find(t => t.user_id === 'employee');
    Object.assign(
        token,
        {user: {id: user_id, roles: user_roles}},
        {client: {id: client_id, grants: []}},
    );
    log({token});
    const account = accounts.find(a => a.id === token.account_id);
    log({account});
    const user = users.find(u => u.id === token.user.id);
    log({user});
    const rules = getRules(account, user);
    return {account, rules, token, user};
}
