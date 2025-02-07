import expressApp from '../../app';
// eslint-disable-next-line import/order
import internal from './router';
import config from '../../config';
import apiKey from '../../middlewares/api-key';
import apiGatewayEventHandler from '../../utils/api-gateway-event-handler';

export const handler = apiGatewayEventHandler('/internal', expressApp((_app) => {
    _app.use('/', apiKey(config.internalApiKey), internal);
}));
