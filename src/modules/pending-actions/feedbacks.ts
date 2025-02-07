import {Context, SQSEvent} from 'aws-lambda';
import {FeedbackStatus} from 'modules/feedbacks/schema';
import OrgChartsService from 'modules/orgchart/service';
import {User} from 'modules/users/schema';
import QueueService from 'utils/queues';

import config from '../../config';
import {ErrorsNotification} from '../errors/errors';
import {PendingActionsTypes} from './schema';
import PendingActionsService from './service';

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
        } = record;

        const payload = JSON.parse(JSON.parse(MessageBody).Message);

        if (payload.EventType === 'INSERT') {
            const {NewItem: feedback} = payload;

            if (!feedback.status || feedback.status === FeedbackStatus.approved) {
                await PendingActionsService.config(config, 'feedbacks-change-handler', feedback.account).create(
                    feedback.account,
                    feedback.employee,
                    feedback.sector,
                    PendingActionsTypes.FeedbackNotRead,
                    feedback.id,
                    feedback.created_at,
                    {type: feedback.type, sector: feedback.sector, created_by: feedback.created_by},
                );
            } else if (feedback.status === FeedbackStatus.pending_approval) {
                const sectors = OrgChartsService.config(config, {id: 'feedbacks-change-handler'} as User, feedback.account);
                const sector = await sectors.retrieve(feedback.sector);
                const managerSector = await sectors.managersSectorFor(sector, sector.manager === feedback.employee);

                if (managerSector.manager) {
                    await PendingActionsService.config(config, 'feedbacks-change-handler', feedback.account).create(
                        feedback.account,
                        managerSector.manager,
                        managerSector.id,
                        PendingActionsTypes.FeedbackPendingApproval,
                        feedback.id,
                        feedback.created_at,
                        {type: feedback.type, sector: feedback.sector, created_by: feedback.created_by, employee: feedback.employee},
                    );
                } else {
                    console.warn('Manager not found');
                }
            }
        } else if (payload.EventType === 'MODIFY') {
            if (!payload.OldItem?.read && payload.NewItem?.read) {
                const {NewItem: feedback} = payload;
                await PendingActionsService.config(config, 'feedbacks-change-handler', feedback.account).setDone(
                    feedback.account,
                    feedback.employee,
                    PendingActionsTypes.FeedbackNotRead,
                    feedback.id,
                );
            }
            if (payload.OldItem?.status === FeedbackStatus.pending_approval && payload.NewItem.status !== FeedbackStatus.pending_approval) {
                const {NewItem: feedback} = payload;

                const actions = await PendingActionsService.config(config, 'feedbacks-change-handler', feedback.account)
                    .listByTypeAndId(
                        feedback.account,
                        PendingActionsTypes.FeedbackPendingApproval,
                        feedback.id,
                    );

                for (const action of actions) {
                    await PendingActionsService.config(config, 'feedbacks-change-handler', feedback.account)
                        .setDoneWithAction(action);
                }

            }
            if (payload.OldItem?.status === FeedbackStatus.pending_approval && payload.NewItem?.status === FeedbackStatus.approved) {
                const {NewItem: feedback} = payload;
                await PendingActionsService.config(config, 'feedbacks-change-handler', feedback.account).create(
                    feedback.account,
                    feedback.employee,
                    feedback.sector,
                    PendingActionsTypes.FeedbackNotRead,
                    feedback.id,
                    feedback.created_at,
                    {type: feedback.type, sector: feedback.sector, created_by: feedback.created_by},
                );
            }
        } else {
            const {OldItem: feedback} = payload;
            if (!feedback.read) {
                await PendingActionsService.config(config, 'feedbacks-change-handler', feedback.account).setDone(
                    feedback.account,
                    feedback.employee,
                    PendingActionsTypes.FeedbackNotRead,
                    feedback.id,
                );
            }
        }

        await queues.deleteMessage(record);
    }
}

const queues = QueueService.config(config);
