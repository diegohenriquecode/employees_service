import {SQSClient, DeleteMessageCommand, DeleteMessageCommandInput} from '@aws-sdk/client-sqs';
import {SQSRecord} from 'aws-lambda';
import {BarueriConfig} from 'config';

export default class QueueService {
    static config(cfg: BarueriConfig) {
        if (!QueueService.client) {
            QueueService.client = cfg.local
                ? new SQSClient({region: 'localhost', endpoint: 'http://localhost:9324'})
                : new SQSClient();
        }
        return new QueueService(
            QueueService.client,
            cfg.debug,
        );
    }

    async deleteMessage(record: Pick<SQSRecord, 'eventSourceARN' | 'receiptHandle'>) {
        const QueueUrl = await this.arnToUrl(record.eventSourceARN);
        const params: DeleteMessageCommandInput = {
            QueueUrl,
            ReceiptHandle: record.receiptHandle,
        };

        if (this.debug) {
            console.log(JSON.stringify({module: MODULE, function: 'deleteMessage', params}, null, 2));
        }

        let result, hasError = false;
        try {
            const command = new DeleteMessageCommand(params);
            result = await this.sqs.send(command);
            return result;
        } catch (e) {
            result = e;
            hasError = true;
            throw e;
        } finally {
            if (this.debug || hasError) {
                console.log(JSON.stringify({module: MODULE, function: 'deleteMessage', result}, null, 2));
            }
        }
    }

    private arnToUrl(arn: string) {
        const service = arn.split(':')[2];
        const region = arn.split(':')[3];
        const accountId = arn.split(':')[4];
        const queueName = arn.split(':')[5];

        return `https://${service}.${region}.amazonaws.com/${accountId}/${queueName}`;
    }

    constructor(
      private sqs: SQSClient,
      private debug: boolean,
    ) {}

    private static client: SQSClient;
}

const MODULE = 'sqs';
