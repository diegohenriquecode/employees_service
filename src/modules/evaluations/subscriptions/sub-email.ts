import {AccountDTO} from 'api/admin/accounts/schema';
import {Context, SQSEvent} from 'aws-lambda';
import i18n from 'i18n';
import AccountsService from 'modules/accounts/service';
import UsersRepository from 'modules/users/repository';
import EmailsService from 'utils/email-service';
import QueueService from 'utils/queues';

import config, {BarueriConfig} from '../../../config';
import ReceivedEvaluationTemplate from '../../../templates/email-answer-evaluation.ejs';
import EvaluationApeDoneTemplate from '../../../templates/email-evaluation-ape-done.ejs';
import {ErrorsNotification} from '../../errors/errors';
import {Evaluation, EvaluationStatus, EvaluationType} from '../schema';

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
        const {body: MessageBody} = record;
        const payload = JSON.parse(JSON.parse(MessageBody).Message) as {OldItem: Evaluation, NewItem: Evaluation, EventType: string};

        if (payload.EventType === 'INSERT') {
            const {NewItem: evaluation} = payload;

            await handleCreation(evaluation);
        } else if (payload.EventType === 'MODIFY') {
            const {OldItem: old, NewItem: evaluation} = payload;

            if (evaluation.type === EvaluationType.ape) {
                await handleApe(old, evaluation);
            }
        }

        await queues.deleteMessage(record);
    }
}

async function handleApe(old: Evaluation, current: Evaluation) {
    if (old.status !== EvaluationStatus.done && current.status === EvaluationStatus.done) {
        const employee = await UsersRepository.config(config, current.responsible, current.account)
            .retrieve(current.employee);

        if (employee?.email) {
            const account = await accounts.findById(current.account);

            await new Emails(config, account)
                .apeDone({
                    employee: current.employee,
                    id: current.id,
                    to: employee.email,
                });
        }
    }
}

async function handleCreation(evaluation: Evaluation) {
    const account = await accounts.findById(evaluation.account);

    const props = {
        id: evaluation.id,
        employee: evaluation.employee,
        type: evaluation.type.split('.')[0],
    };

    if (!evaluation.responsible && evaluation.evaluations) {
        for (const component of evaluation.evaluations) {
            await emailResponsible(component.responsible, props, account);
        }
    } else if (evaluation.responsible !== evaluation.created_by) {
        await emailResponsible(evaluation.responsible, props, account);
    }
}

async function emailResponsible(responsibleId: string, {employee, id, type}, account: AccountDTO) {
    const responsible = await UsersRepository.config(config, responsibleId, account.id)
        .retrieve(responsibleId);
    if (!responsible?.email) {
        return;
    }

    return new Emails(config, account)
        .answerEvaluation({
            to: responsible.email,
            employee,
            id,
            type,
        });
}

const accounts = AccountsService.config(config, '');
const queues = QueueService.config(config);

class Emails {
    answerEvaluation = ({to, employee, id, type}: ReceivedEvaluationArgs) => {
        const {cfg, account} = this;

        const t = i18n(this.account.lang);
        return EmailsService.config(cfg)
            .send(cfg.notificationsEmailSource, to, t('answer-evaluation.subject'), ReceivedEvaluationTemplate, {
                headerLogoUrl: account.logoUrl || this.cfg.mailAssetsUrl + '/default-logo.png',
                bannerUrl: this.cfg.mailAssetsUrl + '/notification-banner.png',
                colors: this.account.colors,
                title: t('answer-evaluation.title'),
                description: t('answer-evaluation.description'),
                linkText: t('answer-evaluation.linkText'),
                linkUrl: this.cfg.appBaseUrlMask.replace('*', account.subdomain) + `/employees/${employee}/${type}/${id}/fill`,
                sentBy: t('sent-by'),
                barueri: t('barueri'),
            });
    };

    apeDone = ({to, employee, id}: EvaluationApeDoneArgs) => {
        const {cfg, account} = this;

        const t = i18n(this.account.lang);
        return EmailsService.config(cfg)
            .send(cfg.notificationsEmailSource, to, t('evaluation-ape-done.subject'), EvaluationApeDoneTemplate, {
                headerLogoUrl: account.logoUrl || this.cfg.mailAssetsUrl + '/default-logo.png',
                bannerUrl: this.cfg.mailAssetsUrl + '/notification-banner.png',
                colors: this.account.colors,
                title: t('evaluation-ape-done.title'),
                description: t('evaluation-ape-done.description'),
                linkText: t('evaluation-ape-done.linkText'),
                linkUrl: this.cfg.appBaseUrlMask.replace('*', account.subdomain) + `/employees/${employee}/ape/edit/${id}`,
                sentBy: t('sent-by'),
                barueri: t('barueri'),
            });
    };

    constructor(
        private cfg: BarueriConfig,
        private account: AccountDTO,
    ) {}
}

type ReceivedEvaluationArgs = {
    to: string,
    id: string,
    employee: string,
    type: EvaluationType
};

type EvaluationApeDoneArgs = Omit<ReceivedEvaluationArgs, 'type'>;
