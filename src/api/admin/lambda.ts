import expressApp from '../../app';
// eslint-disable-next-line import/order
import apiGatewayEventHandler from '../../utils/api-gateway-event-handler';
import admin from './router';

export const handler = apiGatewayEventHandler('/admin', expressApp((_app) => {
    _app.use('/', admin);
}));
