import {LambdaClient, InvokeCommand} from '@aws-sdk/client-lambda';
import {BarueriConfig} from 'config';
import {PdfLambdaResponse} from 'modules/pdf/generator';

export default class PdfService {
    static config(cfg: BarueriConfig) {
        if (!PdfService.client) {
            const clientConfig = cfg.local
                ? {endpoint: 'http://localhost:8605'}
                : {};

            PdfService.client = new LambdaClient(clientConfig);
        }

        return new PdfService(PdfService.client, cfg.stage);
    }

    async generate(template: string, data: Record<string, unknown>) {

        const command = new InvokeCommand({
            FunctionName: `barueri-backend-${this.stage}-pdf-generator`,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({data, template}),
        });

        const {Payload} = await this.lambda.send(command);

        if (!Payload) {
            console.error('no payload.', Payload);
            throw new Error();
        }

        const decodedPayload = new TextDecoder().decode(Payload);
        const result = JSON.parse(decodedPayload) as PdfLambdaResponse;

        if (result.status !== 200) {
            throw new Error(result.error || 'unknown error');
        }

        return Buffer.from(result.data as string, 'base64');
    }

    constructor(
        private lambda: LambdaClient,
        private stage: string,
    ) {}

    private static client: LambdaClient;
}
