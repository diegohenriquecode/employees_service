import {SESClient, SendEmailCommand} from '@aws-sdk/client-ses';
import ejs, {Data} from 'ejs';
import fs from 'fs';
import {htmlToText} from 'html-to-text';
import moment from 'moment';
import os from 'os';
import path from 'path';

const MODULE = 'ses';
const sesClient = new SESClient({});

interface EmailsServiceConfig {
    debugMailAddress: string
    debug: boolean
    local?: boolean
}

export default class EmailsService {
    readonly _debugAddress: string;
    readonly _debug: boolean;
    readonly _local: boolean;

    static config(cfg: EmailsServiceConfig) {
        return new EmailsService(
            cfg.debugMailAddress,
            cfg.debug,
            cfg.local,
        );
    }

    async send(from: string, to: string, subject: string, template: string, data: Data) {
        const ejsTemplate = ejs.render(template, data);
        if (this._debugAddress) {
            subject = `${subject} [original p/ ${to}]`;
            to = this._debugAddress;
        }
        const params = {
            Destination: {ToAddresses: [to]},
            Message: {
                Body: {
                    Html: {Data: ejsTemplate, Charset: 'UTF-8'},
                    Text: {Data: htmlToText(ejsTemplate), Charset: 'UTF-8'},
                },
                Subject: {Data: subject, Charset: 'UTF-8'},
            },
            Source: from,
        };
        if (this._debug) {
            console.log(JSON.stringify(params, null, 2));
        }

        if (this._local) {
            const now = moment().toISOString();
            const tmpdir = os.tmpdir();
            const folder = path.resolve(tmpdir, 'barueri_emails', now);
            console.log(`Creating email files at (file://${folder})`);
            fs.mkdirSync(folder, {recursive: true});
            fs.writeFileSync(path.resolve(folder, 'html.html'), params.Message.Body.Html.Data, {encoding: 'utf-8'});
            fs.writeFileSync(path.resolve(folder, 'text.txt'), params.Message.Body.Text.Data, {encoding: 'utf-8'});
            fs.writeFileSync(path.resolve(folder, 'data.json'), JSON.stringify({Destination: params.Destination, Source: params.Source, Subject: params.Message.Subject}, null, 2));
            return;
        }

        let result, hasError = false;
        try {
            const sendEmailCommand = new SendEmailCommand(params);
            result = await sesClient.send(sendEmailCommand);
            return result;
        } catch (e) {
            result = e;
            hasError = true;
            throw e;
        } finally {
            if (this._debug || hasError) {
                console.log(JSON.stringify({module: MODULE, function: 'sendEmail', result}, null, 2));
            }
        }
    }

    constructor(debugAddress: string, debug: boolean, local = false) {
        this._debugAddress = debugAddress;
        this._debug = debug;
        this._local = local;
    }
}
