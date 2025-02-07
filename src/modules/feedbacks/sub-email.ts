import {AccountDTO} from 'api/admin/accounts/schema';
import {Context, SQSEvent} from 'aws-lambda';
import i18n from 'i18n';
import AccountsService from 'modules/accounts/service';
import UsersRepository from 'modules/users/repository';
import EmailsService from 'utils/email-service';
import QueueService from 'utils/queues';

import config, {BarueriConfig} from '../../config';
import ReceivedFeedbackTemplate from '../../templates/email-received-feedback.ejs';
import {ErrorsNotification} from '../errors/errors';
import {Feedback, FeedbackStatus} from './schema';

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

        const payload = JSON.parse(JSON.parse(MessageBody).Message) as {NewItem: Feedback, OldItem: Feedback, EventType: string};

        if (payload.EventType === 'INSERT') {
            const {NewItem: feedback} = payload;
            if (feedback.status === FeedbackStatus.approved) {
                const users = UsersRepository.config(config, feedback.employee, feedback.account);
                const employee = await users.retrieve(feedback.employee);
                if (employee?.email) {
                    const account = await AccountsService.config(config, '')
                        .findById(feedback.account);
                    const manager = await users.retrieve(feedback.created_by);
                    await new Emails(config, account).receivedFeedback({
                        to: employee.email,
                        from: manager?.name,
                        type: feedback.type,
                        id: feedback.id,
                    });
                }
            }
        } else if (payload.EventType === 'MODIFY') {
            if (payload.OldItem?.status === FeedbackStatus.pending_approval && payload.NewItem?.status === FeedbackStatus.approved) {
                const {NewItem: feedback} = payload;
                const users = UsersRepository.config(config, feedback.employee, feedback.account);
                const employee = await users.retrieve(feedback.employee);
                if (employee?.email) {
                    const account = await AccountsService.config(config, '')
                        .findById(feedback.account);
                    const manager = await users.retrieve(feedback.created_by);
                    await new Emails(config, account).receivedFeedback({
                        to: employee.email,
                        from: manager?.name,
                        type: feedback.type,
                        id: feedback.id,
                    });
                }
            }
        }

        await queues.deleteMessage(record);
    }
}

const queues = QueueService.config(config);

class Emails {

    receivedFeedback = ({to, from, id, type}: ReceivedFeedbackArgs) => {
        const t = i18n(this.account.lang);
        return EmailsService.config(this.cfg)
            .send(this.cfg.notificationsEmailSource, to, t('received-feedback.subject'), ReceivedFeedbackTemplate, {
                headerLogoUrl: this.account.logoUrl || this.cfg.mailAssetsUrl + '/default-logo.png',
                bannerUrl: this.cfg.mailAssetsUrl + '/notification-banner.png',
                colors: this.account.colors,
                title: t('received-feedback.title'),
                description: t('received-feedback.description', {from, type: t(`feedback.type.${type}`)}),
                linkText: t('received-feedback.linkText'),
                linkUrl: this.cfg.appBaseUrlMask.replace('*', this.account.subdomain) + `/employees/me/feedbacks/${id}`,
                sentBy: t('sent-by'),
                barueri: t('barueri'),
            });
    };

    constructor(
        private cfg: BarueriConfig,
        private account: AccountDTO,
    ) {}
}

type ReceivedFeedbackArgs = {
    id: string
    to: string
    from: string
    type: string
};
