import {AxiosInstance} from 'axios';
import {InternalError} from 'modules/errors/errors';

import {BarueriConfig} from '../../config';
import axios from '../../utils/axios';

export default class CispayGateway {
    static config(cfg: BarueriConfig) {
        return new CispayGateway(
            axios({
                debug: cfg.debug,
                baseURL: cfg.cispay.baseUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': cfg.cispay.apiKey,
                    'x-client-id': cfg.cispay.clientId,
                },
            }),
        );
    }

    async create(body: BoletoBody) {
        try {
            const {data: result} = await this.cispay.post('/payment/boleto', body);
            return result as CispayPayment;
        } catch {
            throw new InternalError('Error trying to use cispay to create boleto');
        }
    }

    async retrieve(paymentId: CispayPayment['paymentId']) {
        try {
            const {data: result} = await this.cispay.get(`/payment/${paymentId}`);
            return result as CispayPayment;
        } catch {
            throw new InternalError('Error trying to use cispay to retrieve payment');
        }
    }

    constructor(
        private cispay: AxiosInstance,
    ) {}
}

export interface CispayPayment {
    orderId: string,
    paymentId: string,
    cart: {
        sellerId: string,
        productId: string,
        price: number,
    }[],
    customer: {
        name: string,
        identityDocument: string,
        identityDocumentType: string,
        address: {
            street: string,
            number: string,
            complement: string,
            zipcode: string,
            district: string,
            city: string,
            state: string,
            country: string
        },
    },
    payment: {
        amount: number,
        installments: number,
        paymentType: 'Boleto',
    },
    boleto: {
        instructions?: string,
        // write as "DD/MM/YYYY" but read as "YYYY-MM-DD"
        expirationDate: string,
        url: string,
    },
    receivedDate: string,
    capturedDate: string,
    returnCode: string,
    proofOfSale: unknown,
    status: CispayPaymentStatus,
    splitPayments: {
        amount: number,
        sellerId: string,
    }[],
}

export enum CispayPaymentStatus {
    PaymentConfirmed = 2,
}

type BoletoBody = Pick<CispayPayment, 'orderId'|'cart'|'customer'|'payment'> & {boleto: Pick<CispayPayment['boleto'], 'expirationDate'>};
