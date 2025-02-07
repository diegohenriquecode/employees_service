import knex from 'knex';

import fromMango, {simplifyQuery} from './knex-mango';

describe('mango to SQL', () => {
    let db;

    beforeAll(() => {
        db = knex({client: 'mysql'});
    });

    test('single $eq', () => {
        expect(toSql({'$and': [{affiliate: {'$eq': 'bar'}}]}))
            .toBe('select * from `table` where (`affiliate` = ?)');
    });

    test('multiple $eq', () => {
        expect(toSql({'$and': [{affiliate: {'$eq': 'bar'}}, {installment: {'$eq': 1}}]}))
            .toBe('select * from `table` where (`affiliate` = ? and `installment` = ?)');
    });

    test('null $eq', () => {
        expect(toSql({'$and': [{affiliate: {'$eq': null}}]}))
            .toBe('select * from `table` where (`affiliate` is null)');
    });

    test('single $in', () => {
        expect(toSql({'$and': [{status: {'$in': ['Held', 'Ready', 'Processing']}}]}))
            .toBe('select * from `table` where (`status` in (?, ?, ?))');
    });

    test('single $lte', () => {
        expect(toSql({'$and': [{payment_date: {'$lte': new Date().toISOString()}}]}))
            .toBe('select * from `table` where (`payment_date` <= ?)');
    });

    test('mixed', () => {
        expect(toSql({
            '$and': [
                {affiliate: {'$eq': 'bar'}},
                {status: {'$in': ['Held', 'Ready', 'Processing']}},
                {payment_date: {'$lte': new Date().toISOString()}},
            ],
        }))
            .toBe('select * from `table` where (`affiliate` = ? and `status` in (?, ?, ?) and `payment_date` <= ?)');
    });

    test('$or inside $and', () => {
        expect(toSql({'$and': [{affiliate: {'$eq': 'bar'}}, {'$or': [{consolidated: {'$ne': 'foo'}}, {consolidated: {'$eq': null}}]}]}))
            .toBe('select * from `table` where (`affiliate` = ? and (`consolidated` <> ? or `consolidated` is null))');
        expect(toSql({'$and': [{affiliate: {'$eq': 'bar'}}, {'$or': [{consolidated: {'$ne': true}}, {consolidated: {'$eq': null}}]}]}))
            .toBe('select * from `table` where (`affiliate` = ? and (`consolidated` is not ? or `consolidated` is null))');
    });

    test('$or', () => {
        expect(toSql({'$or': [{consolidated: {'$ne': true}}, {consolidated: {'$eq': null}}]}))
            .toBe('select * from `table` where (`consolidated` is not ? or `consolidated` is null)');
        expect(toSql({'$or': [{consolidated: {'$ne': 'foo'}}, {consolidated: {'$eq': null}}]}))
            .toBe('select * from `table` where (`consolidated` <> ? or `consolidated` is null)');
    });

    describe('simplifies', function () {
        it('simplifies $nand', function () {
            const query = {'$nand': [{'$eq': 'whatever'}]};
            const simplified = simplifyQuery(query);
            expect(simplified).toMatchObject({'$and': [{'$ne': 'whatever'}]});
        });

        it('simplifies $nor', function () {
            const query = {'$nor': [{'$eq': 'whatever'}]};
            const simplified = simplifyQuery(query);
            expect(simplified).toMatchObject({'$or': [{'$ne': 'whatever'}]});
        });

        it('simplifies nested $nand', function () {
            const query = {'$nand': [{'$nand': [{'$eq': 'whatever'}]}]};
            const simplified = simplifyQuery(query);
            expect(simplified).toMatchObject({'$and': [{'$and': [{'$eq': 'whatever'}]}]});
        });

        it('simplifies nested $nor', function () {
            const query = {'$nor': [{'$nor': [{'$eq': 'whatever'}]}]};
            const simplified = simplifyQuery(query);
            expect(simplified).toMatchObject({'$or': [{'$or': [{'$eq': 'whatever'}]}]});
        });
    });

    function toSql(mangoQuery) {
        const {sql} = db('table').where(fromMango(mangoQuery)).toSQL();
        return sql;
    }
});
