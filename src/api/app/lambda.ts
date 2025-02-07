import expressApp from '../../app';
// eslint-disable-next-line import/order
import apiGatewayEventHandler from '../../utils/api-gateway-event-handler';
import router from './router';

export const handler = apiGatewayEventHandler('/app', expressApp((_app) => {
    _app.use('/', router);
}));
