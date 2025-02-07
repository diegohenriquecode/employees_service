import express from 'express';
import {StatusCodes} from 'http-status-codes';
import EventsTopicService from 'modules/events/event-topic-service';

import config from '../../config';
import apiKey from '../../middlewares/api-key';
import VideosService from '../../modules/videos/service';

const router = express.Router();
export default router;

router.post('/tokyo', apiKey(config.tokyo.osakaWebhookKey), async (req, res) => {
    if (req.body.type === 'STATUS_CHANGE') {
        await VideosService.config(config, 'tokyo-webhook')
            .updateStatus(req.body.videoId, req.body.status);
    }
    res.sendStatus(204);
});

router.post('/cispay/payments', apiKey(config.cispay.WebhookKey), async (req, res) => {
    await events
        .publish('UpdateBoletoStatus', 1, 'webhook', req.body);

    res.sendStatus(StatusCodes.NO_CONTENT);
});

const events = EventsTopicService.config(config);
