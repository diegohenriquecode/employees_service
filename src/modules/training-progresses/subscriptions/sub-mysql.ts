import {Context, SQSEvent, SQSRecord} from 'aws-lambda';
import config from 'config';

import sqsEventHandler from '../../../utils/sqs-event-handler';
import TrainingProgressesMysqlRepository from '../repository.mysql';

export const handler = (event: SQSEvent, context: Context) => sqsEventHandler(event, context, _handler);

async function _handler(record: SQSRecord) {
    const {body: MessageBody} = record;

    const payload = JSON.parse(JSON.parse(MessageBody).Message);

    if (payload.EventType === 'INSERT') {
        const {NewItem: {_employee_training, ...progress}} = payload;
        await TrainingProgressesMysqlRepository.config(config, 'sub-mysql', progress.account)
            .create(progress);
    } else if (payload.EventType === 'MODIFY') {
        const {OldItem: {_employee_training: _, ...progress}, NewItem: {_employee_training, ...patch}} = payload;
        await TrainingProgressesMysqlRepository.config(config, 'sub-mysql', progress.account)
            .update(progress, patch);
    } else if (payload.EventType === 'REMOVE') {
        const {OldItem: progress} = payload;
        await TrainingProgressesMysqlRepository.config(config, 'sub-mysql', progress.account)
            .remove(progress.employee, progress.training);
    }
}
