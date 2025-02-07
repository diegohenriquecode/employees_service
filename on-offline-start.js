// eslint-disable-next-line @typescript-eslint/no-var-requires
const {LambdaClient, InvokeCommand} = require('@aws-sdk/client-lambda');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {Docker} = require('node-docker-api');

const docker = new Docker({socketPath: '/var/run/docker.sock'});

const sqsContainerName = 'barueri-fake-sqs';
const mysqlContainerName = 'barueri-mysql';

module.exports = class OfflineSetup {
    constructor(serverless) {
        this.serverless = serverless;
        this.hooks = {
            'before:offline:start:init': this.beforeOfflineInit.bind(this),
            'after:offline:start:init': this.afterOfflineInit.bind(this),
            'before:offline:start:end': this.beforeOfflineEnd.bind(this),
        };
        this.log = serverless.cli.log.bind(serverless.cli);
    }

    async beforeOfflineInit() {
        this.log('@@@@@@@@@@@@@@ initiating');
        // await this.startSqsContainer();
        // await this.startMysqlContainer();
    }

    async afterOfflineInit() {
        this.log('migrating mysql');
        const lambda = new LambdaClient({endpoint: 'http://localhost:8605', region: 'offline'});
        const command = new InvokeCommand({
            FunctionName: 'barueri-backend-offline-migrate',
        });
        await lambda.send(command);
        // @ToDo: maybe seed
    }

    async beforeOfflineEnd() {
        this.log('@@@@@@@@@@@@@@ ending');
        // await this.stopContainer(sqsContainerName);
        // await this.stopContainer(mysqlContainerName);
    }

    async startMysqlContainer() {
        try {
            await docker.container.get(mysqlContainerName)
                .start();
        } catch (error) {
            const container = await docker.container.create({
                ExposedPorts: {'3306/tcp': {}},
                Env: [
                    'MYSQL_ROOT_PASSWORD=123456',
                    'MYSQL_USER=barueri',
                    'MYSQL_PASSWORD=barueri',
                    'MYSQL_DATABASE=barueri',
                ],
                Image: 'mysql:5.7',
                PortBindings: {
                    '3306/tcp': [{HostPort: '3366'}],
                },
                name: mysqlContainerName,
            });
            await container.start();
            this.log('created container');
        }
    }

    async startSqsContainer() {
        try {
            await docker.container.get(sqsContainerName)
                .start();
            this.log('started container');
        } catch (error) {
            const container = await docker.container.create({
                ExposedPorts: {'9324/tcp': {}, '9325/tcp': {}},
                Image: 'softwaremill/elasticmq',
                PortBindings: {
                    '9324/tcp': [{HostPort: '9324'}],
                    '9325/tcp': [{HostPort: '9325'}],
                },
                name: sqsContainerName,
            });
            await container.start();
            this.log('created container');

        }
    }

    async stopContainer(name) {
        const container = docker.container.get(name);
        if (container) {
            try {
                await container.kill();
            } catch (error) {
                null;
            }
            // await container.delete();
            this.log(`killed ${name}`);
        }
    }
};
