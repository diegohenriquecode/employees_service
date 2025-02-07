import withoutCSP from 'middlewares/without-csp';
import serverless, {Handler} from 'serverless-http';

import expressApp from '../../app';
import doc from './router';

const app = expressApp((_app) => {
    _app.use('/doc', withoutCSP, doc);
});
const serverlessHandler = serverless(app);

export const handler: Handler = async (event, context) => {
    return serverlessHandler(event, context);
};
