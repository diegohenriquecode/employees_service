import {DynamoDBClient, DynamoDBClientConfig} from '@aws-sdk/client-dynamodb';
import {
    PutCommand,
    DynamoDBDocument,
    PutCommandInput,
    GetCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommand,
    ScanCommand,
    BatchGetCommand,
    BatchWriteCommand,
    GetCommandInput,
    UpdateCommandInput,
    DeleteCommandInput,
    DeleteCommandOutput,
    GetCommandOutput,
    UpdateCommandOutput,
    BatchGetCommandInput,
    BatchGetCommandOutput,
    BatchWriteCommandInput,
    BatchWriteCommandOutput,
    QueryCommandInput,
    ScanCommandInput,
    PutCommandOutput,
    QueryCommandOutput,
    ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';

export default class DynamoClient {
    async put(params: PutCommandInput) {
        const command = new PutCommand(params);
        return await this.execute<PutCommandOutput>(command, 'put');
    }

    async get(params: GetCommandInput) {
        const command = new GetCommand(params);
        return await this.execute<GetCommandOutput>(command, 'get');
    }

    async update(params: UpdateCommandInput) {
        const command = new UpdateCommand(params);
        return await this.execute<UpdateCommandOutput>(command, 'update');
    }

    async delete(params: DeleteCommandInput) {
        const command = new DeleteCommand(params);
        return await this.execute<DeleteCommandOutput>(command, 'delete');
    }

    async query(params: QueryCommandInput) {
        const command = new QueryCommand(params);
        return await this.execute<QueryCommandOutput>(command, 'query');
    }

    async queryAll(params: QueryCommandInput) {
        const allItems = [];
        let totalCount = 0;
        do {
            const {Items = [], LastEvaluatedKey, Count = 0} = await this.query(params);
            allItems.push(...Items);
            totalCount += Count;
            params.ExclusiveStartKey = LastEvaluatedKey;
        } while (params.ExclusiveStartKey);

        return {Items: allItems, Count: totalCount};
    }

    async scan(params: ScanCommandInput) {
        const command = new ScanCommand(params);
        return await this.execute<ScanCommandOutput>(command, 'scan');
    }

    async scanAll(params: ScanCommandInput) {
        const allItems = [];
        let totalCount = 0;
        do {
            const {Items = [], LastEvaluatedKey, Count = 0} = await this.scan(params);
            allItems.push(...Items);
            totalCount += Count;
            params.ExclusiveStartKey = LastEvaluatedKey;
        } while (params.ExclusiveStartKey);

        return {Items: allItems, Count: totalCount};
    }

    async batchGet(params: BatchGetCommandInput) {
        const command = new BatchGetCommand(params);
        return await this.execute<BatchGetCommandOutput>(command, 'batchGet');
    }

    async batchWrite(params: BatchWriteCommandInput) {
        const command = new BatchWriteCommand(params);
        return await this.execute<BatchWriteCommandOutput>(command, 'batchWrite');
    }

    private async execute<TResult>(command: Command, fname: FName) {
        let result;
        let hasError = false;

        if (this.debug) {
            console.log(JSON.stringify({module: MODULE, function: fname, params: command.input}, null, 2));
        }

        try {
            result = await this.dc.send(command);
            return result as TResult;
        } catch (e) {
            result = e;
            hasError = true;
            throw e;
        } finally {
            if (this.debug || hasError) {
                console.log(JSON.stringify({module: MODULE, function: fname, result}, null, 2));
            }
        }
    }

    constructor({debug, isLocal, ...cfg}: DynamoClientProps) {
        if (!DynamoClient.client) {
            DynamoClient.client = new DynamoDBClient(
                isLocal
                    ? {region: 'localhost', endpoint: 'http://localhost:8080'}
                    : cfg,
            );
        }
        this.dc = DynamoDBDocument.from(
            DynamoClient.client,
            {marshallOptions: {removeUndefinedValues: true}},
        );
        this.debug = debug ? debug === true : false;
    }

    private readonly dc: DynamoDBDocument;
    private readonly debug: boolean;
    private static client: DynamoDBClient;
}

type FName = keyof Omit<DynamoDBDocument, 'createSet'>;

const MODULE = 'dynamodb';
interface DynamoClientProps extends DynamoDBClientConfig {
  isLocal?: boolean;
  debug?: boolean;
}

type Command =
  | PutCommand
  | GetCommand
  | UpdateCommand
  | DeleteCommand
  | QueryCommand
  | ScanCommand
  | BatchGetCommand
  | BatchWriteCommand;

export interface DDBStreamEvent<T = Record<string, any>> {
  EventType: 'MODIFY' | 'INSERT' | 'REMOVE';
  OldItem: T | null;
  NewItem: T | null;
}

export interface S3StreamEvent {
    EventType: string;
    Object: S3EventObject,
}

interface S3EventObject {
    etag: string,
    key: string,
    sequencer: string,
    size: number,
    versionId?: string
}
