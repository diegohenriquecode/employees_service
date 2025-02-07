import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {User} from 'modules/users/schema';
import moment from 'moment';

import {BarueriConfig} from '../../config';
import DynamoClient from '../../utils/dynamo-client';
import {ConflictError} from '../errors/errors';
import {ClimateCheck} from './schema';

export default class ClimateChecksRepository {
    static config(cfg: BarueriConfig, account: string, user: string): ClimateChecksRepository {
        return new ClimateChecksRepository(
            new DynamoClient({debug: cfg.debug, isLocal: cfg.local}),
            cfg.climateChecksTable,
            account,
            user,
        );
    }

    async allOfDayBySectorId(day: string, sectorId: string) {
        const {Items = []} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account and begins_with(#date_employee, :day)',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#date_employee': '_DateEmployee',
                '#sector': 'sector',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':day': day,
                ':sector': sectorId,
            },
            FilterExpression: '#sector = :sector',
        });

        return Items as ClimateCheck[];
    }

    async allOfDayBySectorPath(day: string, sectorPath: string) {
        const {Items = []} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account and begins_with(#date_employee, :day)',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#date_employee': '_DateEmployee',
                '#path': '_SectorPath',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':day': day,
                ':path': sectorPath,
            },
            FilterExpression: 'contains(#path, :path)',
        });

        return Items as ClimateCheck[];
    }

    async listByEmployee(employee: string, date: string) {
        const {Items = []} = await this.documents.queryAll({
            TableName: this.table,
            KeyConditionExpression: '#account = :account and begins_with(#date_employee, :date_employee)',
            ExpressionAttributeNames: {
                '#account': 'account',
                '#date_employee': '_DateEmployee',
            },
            ExpressionAttributeValues: {
                ':account': this.account,
                ':date_employee': `${date}#${employee}`,
            },
        });

        return Items as ClimateCheck[];
    }

    async create(employee: string, sector: string, path: string, rank: User['rank'], date: string, answers: ClimateCheckAnswers, manager: string) {
        const Item = {
            ...answers,
            _DateEmployee: `${date}#${employee}#${sector}`,
            _SectorPath: path,
            sector,
            rank,
            account: this.account,
            created_at: moment().toISOString(),
            created_by: this.user,
            updated_at: null,
            updated_by: null,
            manager,
        };
        try {
            await this.documents.put({
                TableName: this.table,
                Item,
                ConditionExpression: 'attribute_not_exists(#range)',
                ExpressionAttributeNames: {'#range': '_DateEmployee'},

            });
            return Item;
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                throw new ConflictError();
            }
            throw e;
        }
    }

    constructor(
        private documents: DynamoClient,
        private table: string,
        private account: string,
        private user: string,
    ) {}
}

export type ClimateCheckAnswers = {
    happy: ClimateCheckAnswer;
    productive: ClimateCheckAnswer;
    supported: ClimateCheckAnswer;
};

type ClimateCheckAnswer = 1 | 2 | 3 | 4 | 5;
