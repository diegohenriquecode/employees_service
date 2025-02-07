import omit from 'lodash/omit';

import {Feedback} from './schema';

export default class FeedbackDbMapper {
    static from(row: any) {
        if (!row) {
            return row;
        }

        return {
            ...row,
        } as Feedback;
    }

    static to(item: Partial<Feedback>) {
        if (!item) {
            return item;
        }

        return omit(item, ['_employee_id']);
    }
}
