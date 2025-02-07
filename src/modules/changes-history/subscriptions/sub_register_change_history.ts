import {Context, SQSEvent} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';
import moment from 'moment';
import QueueService from 'utils/queues';

import ChangesHistoryRepository from '../repository';
import {ChangesHistoryProps} from '../schema';

export const handler = async function (event: SQSEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler(event);
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
        throw e;
    }
};

async function _handler(event: SQSEvent) {
    for (const record of event.Records) {
        const {
            body: MessageBody,
            attributes,
        } = record;
        const entity = /(?:New)(.*)(?:Version)/.exec(attributes.MessageGroupId || '')?.[1];
        if (entity) {
            const payload = JSON.parse(JSON.parse(MessageBody).Message);
            const oldData = payload.OldItem;
            const newData = payload.NewItem;
            const user = newData?.updated_by
                || oldData?.updated_by
                || newData?.created_by
                || oldData?.created_by;

            const account = newData?.account || oldData?.account;
            const change_date = moment().toISOString();

            if (user && account) {
                let entity_id = newData?.id || oldData?.id;
                if (!entity_id) {
                    entity_id = oldData?.employee
                        ? `${oldData?.employee}:${oldData?.training}`
                        : `${newData?.employee}:${newData?.training}`;
                }

                const changeHistory: Omit<ChangesHistoryProps, 'id' | 'diffData'> = {
                    account,
                    user,
                    oldData,
                    newData,
                    changeType: payload.EventType,
                    entity,
                    entity_id,
                    change_date,
                };
                const repository = ChangesHistoryRepository.config(config, user, account);
                await repository.create(changeHistory);
            }
        }

        await queues.deleteMessage(record);
    }
}

const queues = QueueService.config(config);
