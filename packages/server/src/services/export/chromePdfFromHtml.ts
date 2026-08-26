// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { chromium } from "playwright-core";

/** Resolves Chromium from the preferred environment variable, legacy fallback, or Playwright. */
export function resolveChromeExecutablePath(): string {
    const env = process.env.CHROMIUM_EXECUTABLE_PATH?.trim() || process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    if (env) {
        return env;
    }
    return chromium.executablePath();
}

/**
 * Prints HTML to PDF using an isolated headless Chromium browser via Playwright.
 */
export async function printHtmlToPdfWithChrome(
    html: string,
    options: { footerText: string }
): Promise<Buffer> {
    const executablePath = resolveChromeExecutablePath();
    const browser = await chromium.launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
        const page = await browser.newPage({ javaScriptEnabled: false });
        try {
            await page.route(/^(?:https?|wss?):/i, route => route.abort("blockedbyclient"));
            await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60_000 });
            const footer = options.footerText.replace(
                /[&<>"']/g,
                character =>
                    ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;",
                    }[character]!)
            );
            const pdf = await page.pdf({
                format: "A4",
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: "<span></span>",
                footerTemplate: `<div style="box-sizing:border-box;width:100%;padding:0 14mm;font:9px Arial,sans-serif;color:#64748b;display:flex;justify-content:space-between"><span>${footer}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
                margin: { top: "14mm", right: "14mm", bottom: "18mm", left: "14mm" },
            });
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
