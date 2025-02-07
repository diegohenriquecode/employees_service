import {CispayPayment} from './cispay-gateway';

export type BoletoProps = {
    id: string,
    account: string,
    value: number,
    status: BoletoStatus,
    payment: CispayPayment,
};

export type Boleto = BoletoProps & {
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export enum BoletoStatus {
    Paid = 'Paid',
    Expired = 'Expired',
    Pending = 'Pending',
}
