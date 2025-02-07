import omit from 'lodash/omit';

import {Reprimand} from './schema';

export default class ReprimandDbMapper {
    static from(row: any) {
        if (!row) {
            return row;
        }

        return {
            ...row,
        } as Reprimand;
    }

    static to(item: Partial<Reprimand>) {
        if (!item) {
            return item;
        }

        return omit(item, ['_employee_id', '_DocKey', '_AttKey']);
    }
}
