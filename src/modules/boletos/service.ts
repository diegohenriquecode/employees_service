import pick from 'lodash/pick';
import {Account, isFullAddress} from 'modules/accounts/schema';
import moment from 'moment';
import {v4 as uuid} from 'uuid';

import config, {BarueriConfig} from '../../config';
import {BadRequestError, NotFoundError} from '../errors/errors';
import CispayGateway, {CispayPayment} from './cispay-gateway';
import BoletosRepository from './repository';
import {Boleto, BoletoStatus} from './schema';

export default class BoletosService {
    static config(cfg: BarueriConfig, userId: string) {
        return new BoletosService(
            BoletosRepository.config(cfg, userId),
            CispayGateway.config(cfg),
        );
    }

    async create(value: number, date: string, account: Account) {
        const expiresAt = account.payment_day
            ? moment(date).date(account.payment_day)
            : moment(date).endOf('month');
        if (expiresAt.isBefore(moment())) {
            expiresAt.add(1, 'month');
        }

        if (!account.company_name || !account.cnpj || !isFullAddress(account.address)) {
            throw new BadRequestError(`Account ${account.name} not found has not all required fields to generate boletos`);
        }

        const payment = await this.cispay.create({
            orderId: uuid(),
            payment: {amount: value, installments: 1, paymentType: 'Boleto'},
            cart: [{sellerId: config.cispay.sellerId, productId: 'mensalidade', price: value}],
            boleto: {expirationDate: expiresAt.format('DD/MM/YYYY')},
            customer: {
                name: latinized(account.company_name).substring(0, 255),
                identityDocumentType: 'cnpj',
                identityDocument: account.cnpj.replace(/\D/gi, ''),
                address: {
                    street: latinized(account.address.street).substring(0, 60),
                    number: latinized(account.address.number).substring(0, 60),
                    complement: latinized(account.address.additional_info || '').substring(0, 32),
                    zipcode: account.address.postal_code.replace(/\D/gi, ''),
                    district: latinized(account.address.neighborhood).substring(0, 60),
                    city: latinized(account.address.city).substring(0, 18),
                    state: latinized(account.address.state).substring(0, 2),
                    country: 'Brazil',
                },
            },
        });

        return await this.repository.create({
            id: payment.orderId,
            account: account.id,
            value,
            status: BoletoStatus.Pending,
            payment,
        });
    }

    async retrieve(id: string) {
        const result = await this.repository
            .retrieve(id);
        if (!result) {
            throw new NotFoundError();
        }

        return result;
    }

    async list(account: string) {
        const result = await this.repository
            .list(account);

        return result
            .map(b => pick(b, ListFields));
    }

    async setPaid(item: Boleto, payment: CispayPayment) {
        return this.repository.update(item, {
            status: BoletoStatus.Paid,
            payment,
        });
    }

    constructor(
        private repository: BoletosRepository,
        private cispay: CispayGateway,
    ) {}
}

const ListFields = ['id', 'status', 'value', 'created_at', 'updated_at', 'payment.boleto.url', 'payment.boleto.expirationDate'];

function latinized(str: string) {
    return str.normalize('NFKD').replace(/\p{Diacritic}/gu, '');
}
