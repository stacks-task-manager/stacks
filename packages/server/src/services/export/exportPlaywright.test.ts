// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, test } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { generatePdfFromHtml } from "./generatePdfFromHtml";
import { printHtmlToPdfWithPlaywright } from "./playwrightPdfFromHtml";
import { renderExportHtml } from "./renderExportHtml";

test("Playwright produces a valid PDF from the branded task template", async () => {
    const pdf = await generatePdfFromHtml({
        type: "task",
        locale: "en",
        title: "Playwright smoke test",
        data: { title: "A rendered task", progress: 0, description: "Smoke test" },
    });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(10_000);
}, 120_000);

test("PDF rendering blocks remote image requests", async () => {
    let requests = 0;
    const server = createServer((_request, response) => {
        requests += 1;
        response.end("should not be requested");
    });
    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    try {
        const port = (server.address() as AddressInfo).port;
        const pdf = await printHtmlToPdfWithPlaywright(
            `<html><head><style>@import url("http://127.0.0.1:${port}/tracking.css");</style></head><body><img src="http://127.0.0.1:${port}/tracking-pixel"></body></html>`,
            { footerText: "Security test" }
        );
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
        expect(requests).toBe(0);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close(error => (error ? reject(error) : resolve()));
        });
    }
}, 120_000);

test("notepad PDF sanitizes unsafe URLs before rendering", async () => {
    let requests = 0;
    const server = createServer((_request, response) => {
        requests += 1;
        response.end("must not be requested");
    });
    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    try {
        const port = (server.address() as AddressInfo).port;
        const content = `<h1>Safe report</h1><a href="file:///etc/passwd">file link</a><img src="http://127.0.0.1:${port}/tracking-pixel"><style>@import url("http://127.0.0.1:${port}/tracking.css");</style>`;
        const rendered = renderExportHtml("notepad", content, { locale: "en" });
        expect(rendered.html).not.toMatch(/file:\/\/|127\.0\.0\.1|tracking\.css/);

        const pdf = await generatePdfFromHtml({ type: "notepad", locale: "en", data: content });
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
        expect(requests).toBe(0);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close(error => (error ? reject(error) : resolve()));
        });
    }
}, 120_000);
