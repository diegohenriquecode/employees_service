import {AccountDTO} from 'api/admin/accounts/schema';
import {Context, SQSEvent} from 'aws-lambda';
import i18n from 'i18n';
import AccountsService from 'modules/accounts/service';
import UsersRepository from 'modules/users/repository';
import EmailsService from 'utils/email-service';
import QueueService from 'utils/queues';

import config, {BarueriConfig} from '../../config';
import ReceivedCoachingRegisterTemplate from '../../templates/email-received-coaching-register.ejs';
import {ErrorsNotification} from '../errors/errors';
import {CoachingRegister} from './schema';

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

        const payload = JSON.parse(JSON.parse(MessageBody).Message) as {NewItem: CoachingRegister, EventType: string};

        if (payload.EventType === 'INSERT') {
            const {NewItem: coaching} = payload;

            const users = UsersRepository.config(config, coaching.employee, coaching.account);
            const employee = await users.retrieve(coaching.employee);

            if (employee?.email) {

                const account = await accounts.findById(coaching.account);
                const manager = await users.retrieve(coaching.created_by);

                await new Emails(config, account).receivedCoachingRegister({
                    to: employee.email,
                    from: manager?.name,
                    id: coaching.id,
                });
            }
        }

        await queues.deleteMessage(record);
    }
}

const accounts = AccountsService.config(config, '');
const queues = QueueService.config(config);

class Emails {
    receivedCoachingRegister = ({to, from, id}: ReceivedCoachingRegisterArgs) => {
        const t = i18n(this.account.lang);
        return EmailsService.config(this.cfg)
            .send(
                this.cfg.notificationsEmailSource,
                to,
                t('received-coaching.subject'),
                ReceivedCoachingRegisterTemplate,
                {
                    headerLogoUrl: this.account.logoUrl || this.cfg.mailAssetsUrl + '/default-logo.png',
                    bannerUrl: this.cfg.mailAssetsUrl + '/notification-banner.png',
                    colors: this.account.colors,
                    title: t('received-coaching.title'),
                    description: t('received-coaching.description', {from}),
                    linkText: t('received-coaching.linkText'),
                    linkUrl: this.cfg.appBaseUrlMask.replace('*', this.account.subdomain) + `/employees/me/coaching-registers/${id}`,
                    sentBy: t('sent-by'),
                    barueri: t('barueri'),
                });
    };

    constructor(
        private cfg: BarueriConfig,
        private account: AccountDTO,
    ) {}
}

type ReceivedCoachingRegisterArgs = {
    to: string
    from: string
    id: string
};
