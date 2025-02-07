import express from 'express';

import config from '../../../config';
import validation from '../../../middlewares/validation';
import {UnauthorizedError} from '../../../modules/errors/errors';
import SessionsService from '../../../modules/sessions/service';
import TokensService from '../../../modules/tokens/service';
import {
    ChangePasswordSchema,
    IssueTokenSchema,
    ResendCodeSchema,
    SetPasswordSchema,
    ValidateCodeSchema,
} from './schema';

const router = express.Router();
export default router;

router.post('/token', validation(IssueTokenSchema), async (req, res) => {
    if (req.body.client_id !== config.adminClientId) {
        throw new UnauthorizedError();
    }

    const {id: access_token, expires_in, type} = await tokens
        .issue(req.body);
    res.send({
        access_token,
        expires_in,
        type,
    });
});

router.post('/change-password', validation(ChangePasswordSchema), async (req, res) => {
    if (req.body.client_id !== config.adminClientId) {
        throw new UnauthorizedError();
    }

    const result = await SessionsService.config(config)
        .changePassword(req.body);
    res.send(result);
});

router.post('/resend-code', validation(ResendCodeSchema), async (req, res) => {
    const result = await SessionsService.config(config, req.body.session)
        .resendCode(req.body.session);
    res.send(result);
});

router.post('/validate-code', validation(ValidateCodeSchema), async (req, res) => {
    const result = await SessionsService.config(config, req.body.session)
        .validateCode(req.body.session, req.body.code);
    res.send(result);
});

router.post('/set-password', validation(SetPasswordSchema), async (req, res) => {
    const result = await SessionsService.config(config, req.body.session)
        .setPassword(req.body.session, req.body.password);
    res.send(result);
});

const tokens = TokensService.config(config, 'anonymous');
