import express from 'express';
import fs from 'fs/promises';
import {ExpressMiddleware} from 'middlewares/middlewares.types';
import path from 'path';
import YAML from 'yaml';

import config from '../../config';

const router = express.Router();
export default router;

const dirPath = path.join(__dirname, config.local ? '../../../__only_api-doc/src/doc' : '../../doc');

router.get('/api.yml', async (req, res) => {
    const api = await fs.readFile(path.join(dirPath, 'api.yml'), 'utf-8');

    const doc = YAML.parse(api);
    doc.servers = [{url: config.apiBaseUrl}];

    res.send(YAML.stringify(doc));
});

const interceptor: ExpressMiddleware = (req, res, next) => {
    if (config.local && req.url === '/') {
        req.url = '//';
    }
    next();
};

router.use(interceptor, express.static(dirPath));
