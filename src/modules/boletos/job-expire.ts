import {Context, ScheduledEvent} from 'aws-lambda';
import config from 'config';
import {ErrorsNotification} from 'modules/errors/errors';
import moment from 'moment';

import BoletosRepository from './repository';
import {BoletoStatus} from './schema';

export async function handler(event: ScheduledEvent, context: Context) {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    try {
        await _handler();
    } catch (e) {
        console.error(e);
        await ErrorsNotification.publish(context);
    }
}

async function _handler() {
    const itens = await boletos.listByStatus(BoletoStatus.Pending);

    const maxDate = moment().subtract(config.boletoExpirationDelay, 'days').format('YYYY-MM-DD');
    const toExpire = itens
        .filter(boleto => boleto.payment.boleto.expirationDate < maxDate);

    for (const boleto of toExpire) {
        await boletos.update(boleto, {status: BoletoStatus.Expired});
    }
}

const boletos = BoletosRepository.config(config, 'job-expire-boletos');
