import config from 'config';
import express from 'express';
import validation from 'middlewares/validation';
import {onboardingUpdateSchema} from 'modules/onboarding/schema';
import OnboardingService from 'modules/onboarding/service';

const router = express.Router();
export default router;

router.get('/', async (req, res) => {
    const {account, user} = res.locals;

    const result = await OnboardingService.config(config, user, account)
        .retrieve();

    res.send(result);
});

router.patch('/features', validation(onboardingUpdateSchema), async (req, res) => {
    const {account, user} = res.locals;

    const updated = await OnboardingService.config(config, user, account)
        .update(req.body);

    res.send(updated);
});
