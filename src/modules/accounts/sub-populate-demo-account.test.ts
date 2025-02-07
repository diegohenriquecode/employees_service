import moment from 'moment';
import {v4 as uuidV4} from 'uuid';

import {shifted} from './sub-populate-demo-account';

describe('shifted', () => {
    it('shifts "created_at"', () => {
        const item = mockedItem();
        expect(shifted('Table', 1, 'me', item).created_at).toBe(daysAdded(item.created_at, 1));
    });

    it('shifts "updated_at"', () => {
        const item = mockedItem();
        expect(shifted('Table', 1, 'me', item).updated_at).toBe(daysAdded(item.updated_at, 1));
    });

    it('replaces "created_by" only if no diff is passed', () => {
        const item = mockedItem();
        expect(shifted('Table', null, 'me', item).created_by).toBe('me');
        expect(shifted('Table', 1, 'me', item).created_by).toBe(item.created_by);
    });

    it('replaces "updated_by" only if no diff is passed', () => {
        const item = mockedItem();
        expect(shifted('Table', null, 'me', item).updated_by).toBe('me');
        expect(shifted('Table', 1, 'me', item).updated_by).toBe(item.updated_by);
    });

    it('shifts "finished_at" if present', () => {
        const item = mockedItem({finished_at: randomIsoDate()});
        expect(shifted('Table', 1, 'me', item).finished_at).toBe(daysAdded(item.finished_at, 1));
    });

    it('shifts "_SectorDate" for "BarueriClimateCheckAssiduityTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorDate: `${sector}:${date}`});

        expect(shifted('BarueriClimateCheckAssiduityTable', 1, 'me', item)._SectorDate).toBe(sectorDateAdded(item._SectorDate, 1));
    });

    it('shifts "_SectorTypeDate" for "BarueriClimateCheckHistoryTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorTypeDate: `${sector}:deep:${date}`});

        expect(shifted('BarueriClimateCheckHistoryTable', 1, 'me', item)._SectorTypeDate).toBe(sectorTypeDateAdded(item._SectorTypeDate, 1));
    });

    it('shifts "date" for "BarueriClimateCheckAssiduityTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorDate: `${sector}:${date}`});

        expect(shifted('BarueriClimateCheckAssiduityTable', 1, 'me', item).date).toBe(moment(date).add(1, 'd').format('YYYY-MM-DD'));
    });

    it('shifts "date" for "BarueriClimateCheckHistoryTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorTypeDate: `${sector}:deep:${date}`});

        expect(shifted('BarueriClimateCheckHistoryTable', 1, 'me', item).date).toBe(moment(date).add(1, 'd').format('YYYY-MM-DD'));
    });

    it('dont shift "created_at" for "BarueriClimateCheckHistoryTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorTypeDate: `${sector}:deep:${date}`, created_at: undefined, updated_at: undefined});

        expect(shifted('BarueriClimateCheckHistoryTable', 1, 'me', item).created_at).toBe(undefined);
    });

    it('dont shift "updated_at" for "BarueriClimateCheckHistoryTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorTypeDate: `${sector}:deep:${date}`, created_at: undefined, updated_at: undefined});

        expect(shifted('BarueriClimateCheckHistoryTable', 1, 'me', item).updated_at).toBe(undefined);
    });

    it('dont shift "created_at" for "BarueriClimateCheckAssiduityTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorDate: `${sector}:${date}`, created_at: undefined, updated_at: undefined});

        expect(shifted('BarueriClimateCheckAssiduityTable', 1, 'me', item).created_at).toBe(undefined);
    });

    it('dont shift "updated_at" for "BarueriClimateCheckAssiduityTable"', () => {
        const date = randomDate();
        const sector = uuidV4();
        const item = mockedItem({date, _SectorDate: `${sector}:${date}`, created_at: undefined, updated_at: undefined});

        expect(shifted('BarueriClimateCheckAssiduityTable', 1, 'me', item).updated_at).toBe(undefined);
    });

});

const randomIsoDate = () => moment().subtract(Math.round(Math.random() * 100 + 1), 'd').toISOString();
const randomDate = () => moment().subtract(Math.round(Math.random() * 100 + 1), 'd').format('YYYY-MM-DD');

function mockedItem<T extends Record<string, unknown>>(extra: T = {} as T) {
    return {
        created_at: randomIsoDate(),
        updated_at: randomIsoDate(),
        created_by: 'mocker',
        updated_by: 'mocker',
        ...extra,
    };
}

function daysAdded(date: string, days: number) {
    return moment(date).add(days, 'd').toISOString();
}

function sectorDateAdded(sectorDate: string, days: number) {
    const splitted = sectorDate.split(':');
    return `${splitted[0]}:${moment(splitted[1]).add(days, 'd').format('YYYY-MM-DD')}`;
}

function sectorTypeDateAdded(sectorTypeDate: string, days: number) {
    const splitted = sectorTypeDate.split(':');
    return `${splitted[0]}:${splitted[1]}:${moment(splitted[2]).add(days, 'd').format('YYYY-MM-DD')}`;
}

/*
*******************************************************************************
BarueriClimateCheckAssiduityTable
*******************************************************************************
{
 "account": "867912d0-47b6-4fdb-a995-0f63be21142e",
 "_SectorDate": "03472cf5-4b60-4fa2-84ec-4672ccc05cc9:2024-03-12",
 "assiduity": {
  "15844ef9-f33f-439f-8c61-6f93207edec1": false,
  "1f6f8756-000f-4826-8e4b-44c3b260daf9": false,
  "240c12b4-3c12-4fe3-9ec1-548ce9e79358": false,
  "33374e5f-ab8c-4bcd-8f60-25267b11b5be": false,
  "5832b577-fef0-4255-a55c-d62ef232f1ee": false,
  "6aea3ae3-42f7-42f5-b351-3f7c8e17ac5c": false,
  "74e29062-28fb-40be-b187-dcd009ce190f": false,
  "8c9cba5c-9fb7-4863-82e1-8eeddceddf98": false,
  "a6b21600-0efb-42f2-b499-87641c5c338c": false,
  "d54e86e6-9f3e-40c4-acfa-43eb055bab58": false,
  "d92a8310-ec4c-4fd4-a592-e3ed328bf9c2": false,
  "df92adcf-b861-4bd0-90c3-221d04205d70": false,
  "e596f068-981b-461e-8c94-6b6facb31a3d": false
 },
 "created_at": "2024-03-13T03:00:41.529Z",
 "date": "2024-03-12",
 "sector": "03472cf5-4b60-4fa2-84ec-4672ccc05cc9"
}
*******************************************************************************
BarueriClimateCheckHistoryTable
*******************************************************************************
{
 "account": "867912d0-47b6-4fdb-a995-0f63be21142e",
 "_SectorTypeDate": "2abc3d73-0798-493e-aca7-43ed531830b6:deep:2024-03-26",
 "created_at": "2024-03-27T03:00:43.335Z",
 "date": "2024-03-26",
 "happy": 0,
 "productive": 0,
 "sector": "2abc3d73-0798-493e-aca7-43ed531830b6",
 "supported": 0,
 "type": "deep"
}
*******************************************************************************
BarueriClimateChecksTable
*******************************************************************************
{
 "account": "b2c5cabe-ffc6-4930-93cf-6e2d238f9efa",
 "_DateEmployee": "2023-12-22#00#0004abed-83bb-4478-9d0d-5ebcc3e46c23#c2d910c0-aa1a-4e2a-8544-bdec5b870ab9",
 "created_at": "2024-03-21T21:07:15.176Z",
 "created_by": "0004abed-83bb-4478-9d0d-5ebcc3e46c23",
 "happy": 1,
 "manager": "4e8abd88-84f5-4bfd-9a94-695b8a5ded81",
 "productive": 2,
 "rank": "51b2357f-28b6-429a-bc7a-203df744a067",
 "sector": "c2d910c0-aa1a-4e2a-8544-bdec5b870ab9",
 "supported": 1,
 "updated_at": null,
 "updated_by": null,
 "_SectorPath": "root;03472cf5-4b60-4fa2-84ec-4672ccc05cc9;2abc3d73-0798-493e-aca7-43ed531830b6;c2d910c0-aa1a-4e2a-8544-bdec5b870ab9"
}
 */
