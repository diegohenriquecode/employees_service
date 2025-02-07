import JoiDate from '@joi/date';
import OriginalJoi, {Schema} from 'joi';

const Joi = OriginalJoi.extend(JoiDate(OriginalJoi)) as typeof OriginalJoi;
export default Joi;

export function extract<T, R extends { [P in keyof T as string]: any }>(schema: Schema<T>, include: (keyof R)[], optional?: (keyof R)[]): Schema<R> {
    let result = Joi.object();

    for (const key of Object.keys(schema.describe().keys)) {
        if (include.includes(key)) {
            let field = schema.extract(key);
            if (optional && optional.includes(key)) {
                field = field.optional();
            }
            result = result.append({[key]: field});
        }
    }

    return result;
}
