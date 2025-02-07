import {Rule} from '@rschedule/core/generators';
import '@rschedule/moment-tz-date-adapter/setup';
import moment from 'moment-timezone';

const timezone = 'America/Sao_Paulo';

describe('Rule OccursOn', () => {
    describe('Frequência diária', () => {
        test('Ocorre no início da hora da data de "start"', async () => {
            const start = '2024-04-13T02:59:59.999Z';

            const thisHour = '2024-04-13T02:00:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'DAILY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(true);
        });

        test('Não ocorre em horário diferente ao início da hora da data de "start"', async () => {
            const start = '2024-04-13T02:59:59.999Z';

            const thisHour = '2024-04-13T02:30:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'DAILY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(false);
        });

        test('Ocorre no próximo dia no início da hora da data de "start"', async () => {
            const start = '2024-04-13T02:59:59.999Z';

            const thisHour = '2024-04-14T02:00:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'DAILY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(true);
        });
    });

    describe('Frequência semanal', () => {
        test('Ocorre na data de "start"', async () => {
            const start = '2024-04-13T02:59:59.999Z';

            const thisHour = '2024-04-13T02:00:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'WEEKLY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(true);
        });

        test('Não ocorre mo dia seguinte a data de "start"', async () => {
            const start = '2024-04-13T02:59:59.999Z';

            const thisHour = '2024-04-14T02:00:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'WEEKLY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(false);
        });

        test('Ocorre 7 dias após a data de "start"', async () => {
            const start = '2024-04-13T02:59:59.999Z';

            const thisHour = '2024-04-20T02:00:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'WEEKLY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(true);
        });
    });

    describe('Frequência mensal', () => {
        test('Ocorre no início da hora da data de "start"', async () => {
            const start = '2024-01-10T02:59:59.999Z';

            const thisHour = '2024-01-10T02:00:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'MONTHLY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(true);
        });

        test('Ocorre no mês seguinte a data de "start"', async () => {
            const start = '2024-01-10T02:59:59.999Z';

            const thisHour = '2024-02-10T02:00:00.000Z';

            const rule = new Rule({
                interval: 1,
                frequency: 'MONTHLY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(thisHour, timezone).startOf('hour').add(1, 'second'),
            }, {timezone});

            expect(rule.occursOn({date: moment.tz(thisHour, timezone)})).toBe(true);
        });
    });

    describe('Ocorrências', () => {
        test('Ocorre diariamente com "start" e "end"', () => {
            const start = '2024-04-15T02:59:59.999Z';
            const end = '2024-04-18T02:59:59.999Z';

            const occurrences = [
                '2024-04-15T02:00:00.000Z',
                '2024-04-16T02:00:00.000Z',
                '2024-04-17T02:00:00.000Z',
                '2024-04-18T02:00:00.000Z',
            ];

            const rule = new Rule({
                interval: 1,
                frequency: 'DAILY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(end, timezone).startOf('hour'),
            }, {timezone});

            const list = rule.occurrences({take: 4});

            expect(list.toArray().map(i => i.toISOString())).toEqual(occurrences);
        });

        test('Não ocorre na data final se a hora for anterior a hora de início', () => {
            const start = '2024-04-15T02:59:59.999Z';
            const end = '2024-04-18T01:00:00.000Z';

            const occurrences = [
                '2024-04-15T02:00:00.000Z',
                '2024-04-16T02:00:00.000Z',
                '2024-04-17T02:00:00.000Z',
            ];

            const rule = new Rule({
                interval: 1,
                frequency: 'DAILY',
                start: moment.tz(start, timezone).startOf('hour'),
                end: moment.tz(end, timezone).startOf('hour'),
            }, {timezone});

            const list = rule.occurrences({take: 4});

            expect(list.toArray().map(i => i.toISOString())).toEqual(occurrences);
        });

        test('Ocorrência mensal com início no dia 31 só acontece em meses com 31 dias', () => {
            const start = '2024-02-01T02:59:59.999Z';

            const occurrences = [
                '2024-02-01T02:00:00.000Z',
                '2024-04-01T02:00:00.000Z',
                '2024-06-01T02:00:00.000Z',
                '2024-08-01T02:00:00.000Z',
                '2024-09-01T02:00:00.000Z',
            ];

            const rule = new Rule({
                interval: 1,
                frequency: 'MONTHLY',
                start: moment.tz(start, timezone).startOf('hour'),
            }, {timezone});

            const list = rule.occurrences({take: 5});

            expect(list.toArray().map(i => i.toISOString())).toEqual(occurrences);
        });

        test('Ocorrência mensal com início no dia 30 só acontece em meses com 30 dias', () => {
            const start = '2024-01-31T02:59:59.999Z';

            const occurrences = [
                '2024-01-31T02:00:00.000Z',
                '2024-03-31T02:00:00.000Z',
                '2024-05-01T02:00:00.000Z',
                '2024-05-31T02:00:00.000Z',
                '2024-07-01T02:00:00.000Z',
            ];

            const rule = new Rule({
                interval: 1,
                frequency: 'MONTHLY',
                start: moment.tz(start, timezone).startOf('hour'),
            }, {timezone});

            const list = rule.occurrences({take: 5});

            expect(list.toArray().map(i => i.toISOString())).toEqual(occurrences);
        });

        test('Ocorrência mensal com início no dia 29 só acontece em meses com 29 dias', () => {
            const start = '2024-01-30T02:59:59.999Z';

            const occurrences = [
                '2024-01-30T02:00:00.000Z',
                '2024-03-01T02:00:00.000Z',
                '2024-03-30T02:00:00.000Z',
                '2024-04-30T02:00:00.000Z',
                '2024-05-30T02:00:00.000Z',
            ];

            const rule = new Rule({
                interval: 1,
                frequency: 'MONTHLY',
                start: moment.tz(start, timezone).startOf('hour'),
            }, {timezone});

            const list = rule.occurrences({take: 5});

            expect(list.toArray().map(i => i.toISOString())).toEqual(occurrences);
        });
    });

});
