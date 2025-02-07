import {NextFunction} from 'express';
import {PermissionTypes, permissionResources} from 'modules/admins/schema';

import adminCan from './admin-can';

describe('Admin permission middleware', () => {
    let mockRequest: Request;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    describe('list permission', () => {
        beforeEach(() => {
            mockRequest = {};
            mockResponse = {};
            nextFunction = jest.fn();
            const user = {
                permissions: {
                    [permissionResources.commercialAccounts]: PermissionTypes.list,
                },
            };

            Object.assign(mockResponse, {locals: {oauth: {token: {user}}}});
        });

        test('can list', () => {
            adminCan(permissionResources.commercialAccounts, PermissionTypes.list)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toBeCalledTimes(1);
        });

        test.each([
            PermissionTypes.detail,
            PermissionTypes.create,
            PermissionTypes.delete,
            PermissionTypes.edit,
        ])('cannot', (permission) => {
            expect(() => {
                adminCan(permissionResources.commercialAccounts, permission)(mockRequest, mockResponse, nextFunction);
            }).toThrowError();
        });
    });

    describe('detail permission', () => {
        beforeEach(() => {
            mockRequest = {};
            mockResponse = {};
            nextFunction = jest.fn();
            const user = {
                permissions: {
                    [permissionResources.commercialAccounts]: PermissionTypes.detail,
                },
            };

            Object.assign(mockResponse, {locals: {oauth: {token: {user}}}});
        });

        test('can detail', () => {
            adminCan(permissionResources.commercialAccounts, PermissionTypes.detail)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toBeCalledTimes(1);
        });

        test.each([
            PermissionTypes.list,
            PermissionTypes.create,
            PermissionTypes.delete,
            PermissionTypes.edit,
        ])('cannot', (permission) => {
            expect(() => {
                adminCan(permissionResources.commercialAccounts, permission)(mockRequest, mockResponse, nextFunction);
            }).toThrowError();
        });

    });

    describe('create permission', () => {
        beforeEach(() => {
            mockRequest = {};
            mockResponse = {};
            nextFunction = jest.fn();
            const user = {
                permissions: {
                    [permissionResources.commercialAccounts]: PermissionTypes.create,
                },
            };

            Object.assign(mockResponse, {locals: {oauth: {token: {user}}}});
        });

        test('can create', () => {
            adminCan(permissionResources.commercialAccounts, PermissionTypes.create)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toBeCalledTimes(1);
        });

        test.each([
            PermissionTypes.detail,
            PermissionTypes.list,
            PermissionTypes.delete,
            PermissionTypes.edit,
        ])('cannot', (permission) => {
            expect(() => {
                adminCan(permissionResources.commercialAccounts, permission)(mockRequest, mockResponse, nextFunction);
            }).toThrowError();
        });
    });

    describe('delete permission', () => {
        beforeEach(() => {
            mockRequest = {};
            mockResponse = {};
            nextFunction = jest.fn();
            const user = {
                permissions: {
                    [permissionResources.commercialAccounts]: PermissionTypes.delete,
                },
            };

            Object.assign(mockResponse, {locals: {oauth: {token: {user}}}});
        });

        test('can delete', () => {
            adminCan(permissionResources.commercialAccounts, PermissionTypes.delete)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toBeCalledTimes(1);
        });

        test.each([
            PermissionTypes.detail,
            PermissionTypes.create,
            PermissionTypes.list,
            PermissionTypes.edit,
        ])('cannot', (permission) => {
            expect(() => {
                adminCan(permissionResources.commercialAccounts, permission)(mockRequest, mockResponse, nextFunction);
            }).toThrowError();
        });
    });

    describe('manage permission', () => {
        beforeEach(() => {
            mockRequest = {};
            mockResponse = {};
            nextFunction = jest.fn();
            const user = {
                permissions: {
                    [permissionResources.commercialAccounts]: PermissionTypes.manage,
                },
            };

            Object.assign(mockResponse, {locals: {oauth: {token: {user}}}});
        });

        test.each([
            PermissionTypes.detail,
            PermissionTypes.create,
            PermissionTypes.list,
            PermissionTypes.edit,
            PermissionTypes.delete,
        ])('can all', (permission) => {
            adminCan(permissionResources.commercialAccounts, permission)(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toBeCalledTimes(1);
        });
    });
});
