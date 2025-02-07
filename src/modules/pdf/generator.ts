import chromium from '@sparticuz/chromium';
import {Context} from 'aws-lambda';
import config from 'config';
import ejs from 'ejs';
import puppeteer from 'puppeteer-core';

export type PdfLambdaEvent = {
    data: Record<string, unknown>
    template: string
};

export type PdfLambdaResponse = {
    status: number
    data?: string
    error?: string
};

export async function handler(event: PdfLambdaEvent, context: Context): Promise<PdfLambdaResponse | string> {
    if (config.debug) {
        console.log(JSON.stringify({event}, null, 2));
        console.log(JSON.stringify({context}, null, 2));
    }

    const {data, template} = event;
    if (!data) {
        return {status: 400, error: 'missing data'};
    }

    if (!template) {
        return {status: 400, error: 'missing template'};
    }

    let html;
    try {
        html = ejs.render(template, data);
    } catch (error) {
        console.error('failed to render', error);
        return {status: 500, error: 'failed to render template'};
    }

    try {
        const buffer = await bufferFromHtml(html);
        return {status: 200, data: buffer.toString('base64')};
    } catch (error) {
        console.error('failed to generate buffer', error);
        return {status: 500, error: 'failed to generate buffer'};
    }
}

async function bufferFromHtml(html: string) {
    let browser = null;

    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        await page.setContent(html, {waitUntil: 'networkidle2'});

        await page.emulateMediaType('print');

        return await page.pdf({
            format: 'A4',
            printBackground: true,
        });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}
