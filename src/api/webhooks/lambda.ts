import expressApp from '../../app';
// eslint-disable-next-line import/order
import apiGatewayEventHandler from '../../utils/api-gateway-event-handler';
import webhooks from './router';

export const handler = apiGatewayEventHandler('/webhooks', expressApp((_app) => {
    _app.use('/', webhooks);
}));
