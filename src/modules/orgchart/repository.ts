import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {BarueriConfig} from 'config';
import chunk from 'lodash/chunk';
import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import DynamoClient from '../../utils/dynamo-client';
import {Sector, SectorProps} from './schema';

// Se quiser mudar estas constantes, lembre que afeta todos os setores já criados.
export const ROOT_ID = 'root';

export default class OrgSectorsRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new OrgSectorsRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.orgSectorsTable,
            cfg.orgSectorsByPath,
            user,
            account,
        );
    }

    async add(sector: Pick<SectorProps, 'color' | 'name' | 'path'>, isRoot = false) {
        const id = isRoot ? ROOT_ID : uuidV4();
        let path = sector.path;
        if (id !== ROOT_ID) {
            path = `${sector.path};${id}`;
        }
        const Item: Sector = {
            ...sector,
            account: this.account,
            id,
            manager: null,
            path,
            removed: false,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return Item;
    }

    async all(options: {includeRemoved?: boolean} = {}) {
        const {includeRemoved = true} = options;

        const input: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account',
            ExpressionAttributeNames: {
                '#account': 'account',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
            },
        };

        if (!includeRemoved) {
            input.ExpressionAttributeNames['#removed'] = 'removed';
            input.ExpressionAttributeValues[':removed'] = false;
            input.FilterExpression = '(#removed = :removed or attribute_not_exists(#removed))';
        }

        const {Items = []} = await this.documents.queryAll(input);

        if (!Items.length) {
            Items.push(await this.createRoot());
        }

        return Items as Sector[];
    }

    async batchUpdate(updatedItems: Sector[]) {
        const groups = chunk(updatedItems, 25);
        for (const group of groups) {
            await this.documents.batchWrite({
                RequestItems: {
                    [this.table]: group.map(Item => ({
                        PutRequest: {
                            Item,
                        },
                    })),
                },
            });
        }
    }

    async listByPath(path: string, options: {includeRemoved?: boolean, filterId?: string} = {}) {
        const {filterId, includeRemoved = true} = options;

        const input: DocumentClient.QueryInput & Required<Pick<DocumentClient.QueryInput, 'ExpressionAttributeNames' | 'ExpressionAttributeValues'>> = {
            TableName: this.table,
            KeyConditionExpression: '#account = :account and begins_with(#path, :path)',
            IndexName: this.byPath,
            ExpressionAttributeNames: {
                '#account': 'account',
                '#path': 'path',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':path': path,
            },
        };

        if (filterId) {
            input.ExpressionAttributeNames['#id'] = 'id';
            input.ExpressionAttributeValues[':id'] = options.filterId;
            input.FilterExpression = '#id <> :id';
        }

        if (!includeRemoved) {
            input.ExpressionAttributeNames['#removed'] = 'removed';
            input.ExpressionAttributeValues[':removed'] = false;
            const expression = '(#removed = :removed or attribute_not_exists(#removed))';
            input.FilterExpression = input.FilterExpression ? `${input.FilterExpression} and ${expression}` : expression;
        }

        const {Items = []} = await this.documents.queryAll(input);

        if (path === ROOT_ID && !Items.length) {
            Items.push(await this.createRoot());
        }

        return Items as Sector[];
    }

    async update(current: Sector, patch: Partial<SectorProps>) {
        const Item: Sector = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item,
        });

        return Item;
    }

    async retrieve(id: string) {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: {account: this.account, id},
        });
        if (!Item && id === ROOT_ID) {
            return this.createRoot();
        }
        return Item as Sector;
    }

    async patch(id: string, fieldName: string, fieldValue: any) {
        await this.documents.update({
            TableName: this.table,
            Key: {account: this.account, id},
            UpdateExpression: 'SET #field = :value, #updated = :updated, #user = :user',
            ExpressionAttributeNames: {'#field': fieldName, '#updated': 'updated_at', '#user': 'updated_by'},
            ExpressionAttributeValues: {':value': fieldValue, ':updated': moment().toISOString(), ':user': this.user},
        });
    }

    private createRoot() {
        return this.add({color: '', name: 'Raíz', path: ROOT_ID}, true);
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private byPath: string,
        private user: string,
        private account: string,
    ) {}
}
