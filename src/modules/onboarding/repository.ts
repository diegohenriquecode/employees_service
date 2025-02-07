import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {BarueriConfig} from 'config';
import {ConflictError} from 'modules/errors/errors';
import moment from 'moment';

import DynamoClient from '../../utils/dynamo-client';
import {Onboarding} from './schema';

export default class OnboardingRepository {
    static config(cfg: BarueriConfig, user: string, account: string) {
        return new OnboardingRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.onboardingTable,
            user,
            account,
        );
    }

    async create() {
        const Item = {
            features: {},
            account: this.account,
            userId: this.user,
            geralSkipped: false,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        try {
            await this.documents.put({
                TableName: this.table,
                Item: Item,
                ConditionExpression: 'attribute_not_exists(id)',
            });

        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }

        return Item;
    }

    async retrieve(): Promise<Onboarding> {
        const {Item} = await this.documents.get({
            TableName: this.table,
            Key: this.getKey(),
        });

        let newItem = {};
        if (!Item) {
            newItem = await this.create();
        }

        return (Item || newItem) as Onboarding;
    }

    async update(current: Onboarding, patch: Partial<Onboarding>) {
        const Item = {
            ...current,
            ...patch,
            updated_at: moment().toISOString(),
            updated_by: this.user,
        };

        await this.documents.put({
            TableName: this.table,
            Item: Item,
        });

        return Item;
    }

    private getKey() {
        return {
            account: this.account,
            userId: this.user,
        };
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private user: string,
        private account: string,
    ) {}
}
