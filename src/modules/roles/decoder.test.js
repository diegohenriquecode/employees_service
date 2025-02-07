import decode, {objectType} from './decoder';

describe('slash handling', () => {
    test('list', () => {
        const {action, object} = decode('GET', '/users');
        expect(action).toBe('list');
        expect(object).toBe('User');
    });
    test('list ignores trailing slash', () => {
        const {action, object} = decode('GET', '/users/');
        expect(action).toBe('list');
        expect(object).toBe('User');
    });
    test('list ignores starting slash', () => {
        const {action, object} = decode('GET', 'users/');
        expect(action).toBe('list');
        expect(object).toBe('User');
    });
});

describe('single level', () => {
    test('create', () => {
        const {action, object} = decode('POST', '/users');
        expect(action).toBe('create');
        expect(object).toBe('User');
    });

    test('details', () => {
        const {action, object, context} = decode('GET', '/users/me');
        expect(action).toBe('detail');
        expect(objectType(object)).toBe('User');
        expect(object.id).toBe('me');
        expect(context.user).toBe('me');
    });

    test('update', () => {
        const {action, object, context} = decode('PUT', '/users/me');
        expect(action).toBe('update');
        expect(objectType(object)).toBe('User');
        expect(object.id).toBe('me');
        expect(context.user).toBe('me');
    });

    test('delete', () => {
        const {action, object, context} = decode('DELETE', '/users/me');
        expect(action).toBe('delete');
        expect(objectType(object)).toBe('User');
        expect(object.id).toBe('me');
        expect(context.user).toBe('me');
    });

    test('update field', () => {
        const {action, object, field, context} = decode('PUT', '/users/me/disabled');
        expect(action).toBe('update');
        expect(objectType(object)).toBe('User');
        expect(object.id).toBe('me');
        expect(field).toBe('disabled');
        expect(context.user).toBe('me');
    });
});

describe('many levels', () => {
    test('list', () => {
        const {action, object, context} = decode('GET', '/employees/me/vacations');
        expect(action).toBe('list');
        expect(objectType(object)).toBe('Vacation');
        expect(object.employee).toBe('me');
        expect(context.employee).toBe('me');
    });
    test('create', () => {
        const {action, object, context} = decode('POST', '/employees/me/vacations');
        expect(action).toBe('create');
        expect(objectType(object)).toBe('Vacation');
        expect(object.employee).toBe('me');
        expect(context.employee).toBe('me');
    });
    test('details', () => {
        const {action, object, context} = decode('GET', '/employees/me/vacations/uuid');
        expect(action).toBe('detail');
        expect(objectType(object)).toBe('Vacation');
        expect(object.id).toBe('uuid');
        expect(object.employee).toBe('me');
        expect(context.employee).toBe('me');
        expect(context.vacation).toBe('uuid');
    });
    test('update', () => {
        const {action, object, context} = decode('PUT', '/employees/me/vacations/uuid');
        expect(action).toBe('update');
        expect(objectType(object)).toBe('Vacation');
        expect(object.id).toBe('uuid');
        expect(object.employee).toBe('me');
        expect(context.employee).toBe('me');
        expect(context.vacation).toBe('uuid');
    });
    test('delete', () => {
        const {action, object, context} = decode('DELETE', '/employees/me/vacations/uuid');
        expect(action).toBe('delete');
        expect(objectType(object)).toBe('Vacation');
        expect(object.id).toBe('uuid');
        expect(object.employee).toBe('me');
        expect(context.employee).toBe('me');
        expect(context.vacation).toBe('uuid');
    });
    test('update field', () => {
        const {action, object, field, context} = decode('PUT', '/employees/me/vacations/uuid/disabled');
        expect(action).toBe('update');
        expect(objectType(object)).toBe('Vacation');
        expect(object.id).toBe('uuid');
        expect(object.employee).toBe('me');
        expect(field).toBe('disabled');
        expect(context.employee).toBe('me');
        expect(context.vacation).toBe('uuid');
    });
});

describe('invalid', () => {
    test('unknown action', () => {
        const {action} = decode('HEAD', '/users');
        expect(action).toBeUndefined();
    });
    test('unknown entity', () => {
        const {object} = decode('GET', '/foo');
        expect(object).toBeUndefined();
    });
    test('no entity', () => {
        const {object} = decode('GET', '/');
        expect(object).toBeUndefined();
    });
});
