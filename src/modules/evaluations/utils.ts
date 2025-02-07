import cuid from '@paralleldrive/cuid2';
import moment from 'moment/moment';

import {EvaluationTagType} from './schema';

export function createTag(type: EvaluationTagType, reference: string) {
    return `${type}#${reference}#${cuid.init({length: 12})()}`;
}

export function fixedFloat(num: number) {
    return Number.parseFloat(num.toFixed(2));
}

export function computedDaysLate(deadline?: string | null) {
    const result = moment.utc()
        .diff(moment.utc(deadline), 'days');
    if (deadline && result > 0) {
        return result;
    }
}
