import {BarueriConfig} from 'config';
import random from 'generate-password';
import i18n from 'i18n';
import moment from 'moment';

import VerificationCodeTemplate from '../../templates/email-verification-code.ejs';
import EmailsService from '../../utils/email-service';
import AdminsService from '../admins/service';
import {BadRequestError, NotFoundError} from '../errors/errors';
import SessionsRepository from './repository';
import {SessionType} from './schema';

export default class SessionsService {
    static config(cfg: BarueriConfig, user = 'anonymous') {
        return new SessionsService(
            SessionsRepository.config(cfg, user),
            AdminsService.config(cfg, user),
            EmailsService.config(cfg),
            cfg.authEmailSource,
            cfg.mailAssetsUrl,
        );
    }

    async changePassword({username}: {username: string}) {
        const user = await this.admins.findByEmail(username);
        if (!user) {
            console.warn(`Usuário ${username} não encontrado`);
            return {
                state: SessionType.EMAIL_SENT,
            };
        }
        return this.sendCode(user.id, user.email);
    }

    async resendCode(sessionId: string) {
        const session = await this.retrieveAndInvalidate(sessionId, SessionType.VALIDATE_CODE);
        return this
            .sendCode(session.user_id, session.username);
    }

    async validateCode(sessionId: string, code: string) {
        const oldSession = await this.retrieveAndInvalidate(sessionId, SessionType.VALIDATE_CODE);
        const session = await this.repository.create({
            expiresAt: moment().add(15, 'minutes').toISOString(),
            type: oldSession.code === code ? SessionType.SET_PASSWORD : SessionType.VALIDATE_CODE,
            code: oldSession.code,
            user_id: oldSession.user_id,
            username: oldSession.username,
            used: false,
        });

        if (session.code !== code) {
            throw new BadRequestError('Código incorreto', {
                session: session.id,
                state: session.type,
            });
        }

        return {
            session: session.id,
            state: session.type,
        };
    }

    async setPassword(sessionId: string, password: string) {
        const session = await this.retrieveAndInvalidate(sessionId, SessionType.SET_PASSWORD);
        await this.admins.setPassword(session.user_id, password);

        return {
            state: SessionType.SUCCESS,
        };
    }

    private async retrieveAndInvalidate(id: string, type: SessionType) {
        const session = await this.repository.retrieve(id);
        if (!session || session.used || moment().isAfter(session.expiresAt) || session.type !== type) {
            throw new NotFoundError();
        }

        await this.repository.patch(id, 'used', true);
        return session;
    }

    private async sendCode(user_id: string, username: string) {
        const session = await this.repository.create({
            expiresAt: moment().add(15, 'minutes').toISOString(),
            type: SessionType.VALIDATE_CODE,
            code: random.generate({length: 6, numbers: true, lowercase: false, uppercase: false, symbols: false}),
            user_id,
            username,
            used: false,
        });

        await this.sendEmail(username, session.code);

        return {
            session: session.id,
            state: session.type,
        };
    }

    private async sendEmail(username: string, code: string) {
        const t = i18n('ptBR');

        return this.emails
            .send(this.authEmailSource, username, t('sessions-verification-code.subject'), VerificationCodeTemplate, {
                headerLogoUrl: this.mailAssetsUrl + '/default-logo.png',
                bannerUrl: this.mailAssetsUrl + '/code-banner.png',
                code,
            });
    }

    constructor(
        private repository: SessionsRepository,
        private admins: AdminsService,
        private emails: EmailsService,
        private authEmailSource: string,
        private mailAssetsUrl: string,
    ) { }
}
