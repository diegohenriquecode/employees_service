import {SNSClient, PublishInput, PublishCommand} from '@aws-sdk/client-sns';
import {BarueriConfig} from 'config';

type PublishParams = Omit<PublishInput, 'TopicArn' | 'Message'>;

export default class TopicService {
    static config(cfg: BarueriConfig, topic: string, debug: boolean) {
        if (!TopicService.client) {
            TopicService.client = cfg.local
                ? new SNSClient({region: 'localhost', endpoint: 'http://localhost:4002'})
                : new SNSClient();
        }
        return new TopicService(
            TopicService.client,
            topic,
            debug,
        );
    }

    async publish(Data: any, otherParams: PublishParams = {}) {
        const params: PublishInput = {
            ...otherParams,
            TopicArn: this.topic,
            Message: typeof Data === 'string'
                ? Data
                : JSON.stringify(Data, null, this.debug ? 2 : undefined),
        };

        if (this.debug) {
            console.log(JSON.stringify({module: MODULE, function: 'publish', params}, null, 2));
        }

        let result, hasError = false;
        try {
            const command = new PublishCommand(params);
            result = await this.sns.send(command);
            return result;
        } catch (e) {
            result = e;
            hasError = true;
            throw e;
        } finally {
            if (this.debug || hasError) {
                console.log(JSON.stringify({module: MODULE, function: 'publish', result}, null, 2));
            }
        }
    }

    constructor(
        private sns: SNSClient,
        private topic: string,
        private debug: boolean,
    ) {}

    private static client: SNSClient;
}

const MODULE = 'sns';
