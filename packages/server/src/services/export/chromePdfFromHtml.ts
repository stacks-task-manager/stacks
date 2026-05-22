// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import puppeteer from "puppeteer-core";
import { chromium } from "playwright-core";

async function resolveChromeExecutablePath(): Promise<string> {
    const env = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    if (env) {
        return env;
    }
    return chromium.executablePath();
}

/**
 * Prints HTML to PDF using headless Chromium via Puppeteer (supports Page.printToPDF).
 */
export async function printHtmlToPdfWithChrome(html: string): Promise<Buffer> {
    const executablePath = await resolveChromeExecutablePath();
    const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
        const page = await browser.newPage();
        try {
            await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
            const pdf = await page.pdf({ format: "A4", printBackground: true });
            return Buffer.from(pdf);
        } finally {
            try {
                await page.close();
            } catch {
                /* ignore */
            }
        }
    } finally {
        await browser.close();
    }
}
