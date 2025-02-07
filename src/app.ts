import bodyParser from 'body-parser';
import cors from 'cors';
import express, {Express} from 'express';
import helmet from 'helmet';

import 'express-async-errors';
import config from './config';
import exceptions from './middlewares/exceptions';
import noCacheControl from './middlewares/no-cache-control';
import unknownRoute from './middlewares/unknown-route';

export default function expressApp(configRoutes: (_app: Express) => void) {
    const app = express();

    if (config.debug) {
        app.set('json spaces', 2);
    }

    app.use(helmet());
    app.use(cors());

    app.use(bodyParser.json({limit: '6mb', strict: false}));
    app.use(bodyParser.text({limit: '6mb'}));
    app.use(bodyParser.urlencoded({limit: '6mb', extended: false}));

    app.use(noCacheControl);

    configRoutes(app);

    app.use(unknownRoute);
    app.use(exceptions(config.debug));

    return app;
}
