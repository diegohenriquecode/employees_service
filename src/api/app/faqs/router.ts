import config from 'config';
import express from 'express';
import FaqService from 'modules/faq/service';

const router = express.Router();
export default router;

router.get('/', async (req, res) => {
    const userId = res.locals.user.id;

    const list = (await FaqService.config(config, userId).list()).filter(faq => !faq.disabled);

    return res.send(list);
});
