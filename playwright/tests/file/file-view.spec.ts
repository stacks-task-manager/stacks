// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * W5 — File view + FileMenu.
 *
 * Covers the quick-add upload flow (the uploaded file becomes a document and the app
 * navigates to /file/:id showing the original name + formatted size), reload
 * persistence, and the `...` menu (download / preview / delete). Deleting removes the
 * sidebar document and a revisit shows the "requested file was not found" path.
 *
 * The created file document is destroyed before each test ends (§5.1 cleanup contract),
 * keyed on the id captured from the document-creation response (so a failed upload
 * cannot orphan the row).
 */
import type { Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { expect, test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import File from "../../pages/file";

const RUN_TAG = String(Date.now());
const FILE_NAME = `e2e-w5-file-${RUN_TAG}.txt`;
const FILE_BYTES = 512; // humanFileSize(512) === "512 B"

let browser: Browser;
let context: BrowserContext;
let page: Page;
let file: File;
let filePath: string;
let createdDocId: string | null = null;

test.beforeAll(async ({ login: loginPage }: any) => {
    ({ browser, context, page } = await bootstrapContext());
    await loginPage({ page });
    file = new File(page);
    filePath = path.join(os.tmpdir(), FILE_NAME);
    fs.writeFileSync(filePath, "x".repeat(FILE_BYTES));
});

test.beforeEach(() => {
    createdDocId = null;
});

test.afterEach(async () => {
    if (createdDocId) {
        await getDb().cleanupDocument(createdDocId);
        createdDocId = null;
    }
});

test("quick add uploads a file, navigates to the file view, and shows name and size", async () => {
    createdDocId = await file.openFromQuickAdd(filePath);
    await file.waitForLoaded();
    await file.expectFile(FILE_NAME, "512 B");
});

test("reload keeps the file view rendered (not the skeleton)", async () => {
    createdDocId = await file.openFromQuickAdd(filePath);
    await file.waitForLoaded();
    await file.expectFile(FILE_NAME, "512 B");

    await page.reload();
    await file.waitForLoaded();
    await file.expectFile(FILE_NAME, "512 B");
});

test("the file menu downloads and previews through their endpoints", async () => {
    createdDocId = await file.openFromQuickAdd(filePath);
    await file.waitForLoaded();
    await file.expectFile(FILE_NAME, "512 B");

    const downloadUrl = await file.downloadUrl();
    expect(downloadUrl).toContain("/api/files/download/");

    const previewUrl = await file.previewUrl();
    expect(previewUrl).toContain("/api/files/preview/");
});

test("the file menu deletes the file, removes the sidebar document, and 404s on revisit", async () => {
    createdDocId = await file.openFromQuickAdd(filePath);
    await file.waitForLoaded();
    await file.expectFile(FILE_NAME, "512 B");

    await file.requestDelete();
    await file.confirmDelete();

    // The app navigates away after the delete; the sidebar no longer lists the file.
    await file.expectSidebarDocumentGone(FILE_NAME);

    // Revisit the (now deleted) file → the "requested file was not found" path.
    await page.goto(`/file/${createdDocId}`);
    await file.expectMissingFileToast();
});

test.afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    if (createdDocId) {
        try {
            await getDb().cleanupDocument(createdDocId);
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
        cleanupErrors.push(error);
    }
    try {
        await closeDb();
    } catch (error) {
        cleanupErrors.push(error);
    }
    if (page && !page.isClosed()) {
        try {
            await page.close();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (context) {
        try {
            await context.close();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (browser) {
        try {
            await browser.close();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }
    if (cleanupErrors.length) {
        throw new AggregateError(cleanupErrors, "W5 cleanup failed");
    }
});
