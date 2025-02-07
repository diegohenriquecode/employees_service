import {Context, SNSMessage, SQSEvent, SQSRecord} from 'aws-lambda';

import config from '../../../config';
import sqsEventHandler from '../../../utils/sqs-event-handler';
import {InternalError} from '../../errors/errors';
import CispayGateway, {CispayPaymentStatus} from '../cispay-gateway';
import BoletosService from '../service';

export const handler = (event: SQSEvent, context: Context) => sqsEventHandler(event, context, _handler);

interface CispayNotificationPayload {
    PaymentId: string;
    Status: number;
    OrderId: string;
}

async function _handler(record: SQSRecord) {
    const {PaymentId} = JSON.parse((JSON.parse(record.body) as SNSMessage).Message) as CispayNotificationPayload;

    const payment = await cispay.retrieve(PaymentId);
    const boleto = await boletos.retrieve(payment.orderId);

    if (boleto.payment.paymentId !== PaymentId) {
        throw new InternalError('PaymentId mismatch');
    }

    if (payment.status !== CispayPaymentStatus.PaymentConfirmed) {
        console.warn('Ignore status', payment.status);
        return;
    }

    await boletos
        .setPaid(boleto, payment);
}

const boletos = BoletosService.config(config, 'sub-boletos');
const cispay = CispayGateway.config(config);
