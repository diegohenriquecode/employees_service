import {CloudWatchLogsClient, FilterLogEventsCommand} from '@aws-sdk/client-cloudwatch-logs';
import {Context} from 'aws-lambda';
import {getReasonPhrase, StatusCodes as HttpStatusCodes, ReasonPhrases} from 'http-status-codes';

import config from '../../config';
import TopicService from '../../utils/topic-service';
import EventsTopicService from '../events/event-topic-service';

const inspect = Symbol.for('nodejs.util.inspect.custom');

export class ErrorsNotification {
    static async publish(lambdaContext: Context) {
        try {
            await events
                .publish('Error', 1, 'error', lambdaContext);
        } catch (e) {
            console.error('Erro ao publicar erro');
            console.error(e);
        }
    }
}

export class BarueriError extends Error {
    constructor(
        readonly status: HttpStatusCodes,
        message: string,
    ) {
        super(message);
    }

    static fromError(err: any): BarueriError {
        if (err?.isAxiosError && err?.response?.status >= 500) {
            return new BadGatewayError(err.message, err);
        }
        return new InternalError(err.message, err);
    }

    static fromGateway(err: any) {
        if (!err?.isAxiosError || err?.response?.status >= 500) {
            return new BadGatewayError(err.message, err);
        }
        switch (err?.response?.status) {
        case HttpStatusCodes.BAD_REQUEST:
            return new ValidationError(err?.response?.data?.detail, err?.response?.data?.validation_details);
        case HttpStatusCodes.UNAUTHORIZED:
            return new UnauthorizedError(err?.response?.data?.detail);
        case HttpStatusCodes.PAYMENT_REQUIRED:
            return new PaymentRequiredError(err?.response?.data?.detail);
        case HttpStatusCodes.FORBIDDEN:
            return new ForbiddenError(err?.response?.data?.detail);
        case HttpStatusCodes.NOT_FOUND:
            return new NotFoundError(err?.response?.data?.detail);
        case HttpStatusCodes.CONFLICT:
            return new ConflictError(err?.response?.data?.detail);
        default:
            return new BadGatewayError(err.message, err);
        }
    }

    toJSON() {
        return {
            type: 'about:blank',
            title: getReasonPhrase(this.status),
            status: this.status,
            detail: this.message || undefined,
        };
    }
}

export class BadRequestError extends BarueriError {
    constructor(
        message: string = ReasonPhrases.BAD_REQUEST,
        private extra: Record<string, any> = {},
    ) {
        super(HttpStatusCodes.BAD_REQUEST, message);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            ...(this.extra ?? {}),
        };
    }
}

export class ValidationError extends BarueriError {
    constructor(
        message: string,
        private details: Record<string, any>[] = [],
    ) {
        super(HttpStatusCodes.BAD_REQUEST, message);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            validation_details: this.details,
        };
    }
}

export class UnauthorizedError extends BarueriError {
    constructor(
        message: string = ReasonPhrases.UNAUTHORIZED,
    ) {
        super(HttpStatusCodes.UNAUTHORIZED, message);
    }
}

export class PaymentRequiredError extends BarueriError {
    constructor(
        message: string,
        private extra: Record<string, any> = {},
    ) {
        super(HttpStatusCodes.PAYMENT_REQUIRED, message);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            ...(this.extra ?? {}),
        };
    }
}

export class ForbiddenError extends BarueriError {
    constructor(
        message: string = ReasonPhrases.FORBIDDEN,
    ) {
        super(HttpStatusCodes.FORBIDDEN, message);
    }
}

export class NotFoundError extends BarueriError {
    constructor(
        message: string = ReasonPhrases.NOT_FOUND,
    ) {
        super(HttpStatusCodes.NOT_FOUND, message);
    }
}

export class ConflictError extends BarueriError {
    constructor(
        message: string = ReasonPhrases.CONFLICT,
    ) {
        super(HttpStatusCodes.CONFLICT, message);
    }
}

export class UnprocessableEntity extends BarueriError {
    constructor(
        message: string,
    ) {
        super(HttpStatusCodes.UNPROCESSABLE_ENTITY, message);
    }
}

export class ServerError extends BarueriError {
    stack: any;

    constructor(
        status: HttpStatusCodes,
        message: string,
        private original: Record<string, any>,
    ) {
        super(status, message);
        if (this.original?.stack) {
            this.stack = original.stack;
        }
    }

    static fromError(err: any) {
        if (err?.isAxiosError && err?.response?.status >= 500) {
            return new BadGatewayError(err.message, err);
        }
        if (isBodyParserError(err)) {
            return new BarueriError(err.status, err.type);
        }

        return new InternalError(err.message, err);
    }

    toJSON() {
        return {
            ...(super.toJSON()),
            detail: undefined,
        };
    }

    [inspect]() {
        const original = Array.isArray(this.original)
            ? this.original.map(toJSON)
            : toJSON(this.original);

        return `${this.constructor.name} ${JSON.stringify({
            ...super.toJSON(),
            original,
        })}\n${this.stack || ''}`;
    }
}

export class InternalError extends ServerError {
    constructor(
        message: string,
        original: Record<string, any> = {},
    ) {
        super(HttpStatusCodes.INTERNAL_SERVER_ERROR, message, original);
    }
}

export class BadGatewayError extends ServerError {
    constructor(
        message: string,
        original: Record<string, any>,
    ) {
        super(HttpStatusCodes.BAD_GATEWAY, message, original);
    }
}

export class NotImplemented extends BarueriError {
    constructor(
        message: string = ReasonPhrases.NOT_IMPLEMENTED,
        private extra: Record<string, any> = {},
    ) {
        super(HttpStatusCodes.NOT_IMPLEMENTED, message);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            ...(this.extra ?? {}),
        };
    }
}

function isBodyParserError(err: any) {
    return err.statusCode && err.status && err.type && 'expose' in err;
}

function toJSON(err: any) {
    if (!err) {
        return err;
    }
    if (err.isAxiosError) {
        return {
            ...err.response,
            request: undefined,
        };
    }

    if (err.sql) {
        return err;
    }
    if (err.toJSON) {
        return err.toJSON();
    }
    return err;
}

export class ErrorsChannel {
    static async handle(groupId: string, MessageBody: string) {
        try {
            const lambdaContext = JSON.parse(MessageBody);
            const {awsRequestId, invokedFunctionArn, logGroupName, logStreamName} = lambdaContext;
            const [,,,, account,, name] = invokedFunctionArn.split(':');

            const data = await logs.send(new FilterLogEventsCommand({
                logGroupName,
                logStreamNames: [logStreamName],
                filterPattern: `"${awsRequestId}"`,
            }));

            let result = data.events?.map(({message}) => message).join('\n');
            if (result?.length && result?.length > MaxSNSChars) {
                result = result.slice(0, MaxSNSChars);
            }

            const body = result || `Account: ${account}.\nLambda: ${name}.\nLog Stream: ${logStreamName}.\nRequest: ${awsRequestId}`;
            await errorsTopic.publish(body, {Subject: `[Barueri] Erro em ${name}`});
        } catch (e) {
            console.error('Erro ao publicar erro');
            console.error(e);
        }
    }
}

const errorsTopic = TopicService.config(config, config.errorsTopic, config.debug);
const events = EventsTopicService.config(config);
const logs = new CloudWatchLogsClient();
const MaxSNSChars = 128000;
