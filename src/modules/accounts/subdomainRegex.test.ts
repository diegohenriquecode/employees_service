import {AccountSchema} from './schema';

function testDomainValidNamesRegExp(val: string) {
    return !AccountSchema.extract('subdomain').validate(val).error;
}

const validDomainNames = [
    'example',
    'try',
    'my-example',
    'subdomain',
    'example',
    'example23',
    'regexp-1222',
    'stack',
    'sta-ck',
    'sta---ck',
    '9sta--ck',
    'sta--ck9',
    'stack99',
    '99stack',
    'sta99ck',
];

const invalidDomainNames = [
    '@example',
    'e_xample',
    'ru@22-',
    'example net',
    '.example',
    '-test',
    'test-',
    '$dollars$',
    ' ecmas cript-8 ',
    'example::%',
    'exam::%ple',
    'example example example',
    'dfgdfg.dfgdf33',
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
];

describe('Test Domain Valid Names RegExp', () => {
    validDomainNames.forEach((val) => {
        it(`Text: ${val}`, () => {
            expect(testDomainValidNamesRegExp(val)).toBe(true);
        });
    });
});

describe('Test Domain Invalid Names RegExp', () => {
    invalidDomainNames.forEach((val) => {
        it(`Text: ${val}`, () => {
            expect(testDomainValidNamesRegExp(val)).toBe(false);
        });
    });
});
