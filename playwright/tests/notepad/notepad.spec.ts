import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Notepad from "../../pages/notepad";
import Sidebar from "../../pages/sidebar";
import { PermissionsPage } from "../../pages/permissions";
import { closeDb, getDb } from "../../fixtures/db";

test.describe("Notepad", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let notepad: Notepad;
    let sidebar: Sidebar;
    let notepadName: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        notepad = new Notepad(page);
        sidebar = new Sidebar(page);
        notepadName = `Notepad ${Math.floor(Math.random() * 10000)}`;
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) {
            const matchingNotepads = sidebar.documentsTreeItems.filter({ hasText: notepadName });
            if ((await matchingNotepads.count()) > 0) {
                await notepad.delete(notepadName);
            }
            await expect(matchingNotepads).toHaveCount(0);
        }

        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
        await closeDb().catch(() => undefined);
    });

    test("Should create, edit, reopen, and use header controls", async () => {
        const content = `Persisted notepad content ${Date.now()}`;

        await notepad.addNew(notepadName);
        await expect(notepad.view).toBeVisible();
        await expect(notepad.toolbar).toBeVisible();

        await notepad.setContent(content);
        await expect(notepad.editor).toContainText(content);

        await notepad.toggleWide();
        await expect(notepad.view).toHaveClass(/wide/);
        await notepad.toggleWide();
        await expect(notepad.view).not.toHaveClass(/wide/);

        await expect(notepad.addCoverButton).toBeVisible();
        await notepad.openMenu();
        await expect(notepad.menuItem("notepad-menu-bookmark")).toBeVisible();
        await expect(notepad.menuItem("notepad-menu-copy-link")).toBeVisible();
        await expect(notepad.menuItem("notepad-menu-delete")).toBeVisible();
        await notepad.closeMenu();

        const exported = await notepad.export("html");
        expect(exported.status).toBe(200);
        expect(exported.contentType).toContain("text/html");
        expect(exported.disposition).toContain(".html");
        expect(exported.request).toMatchObject({ format: "html", type: "notepad" });

        await sidebar.go("Home");
        await notepad.openByName(notepadName);
        await expect(notepad.editor).toContainText(content);
    });

    test("Should export the notepad as PDF", async () => {
        await sidebar.go("Home");
        await notepad.openByName(notepadName);

        const exported = await notepad.export("pdf");
        expect(exported.status).toBe(200);
        expect(exported.contentType).toContain("application/pdf");
        expect(exported.disposition).toContain(".pdf");
        expect(exported.request).toMatchObject({ format: "pdf", type: "notepad" });
    });

    test("Should apply rich-text formatting from the toolbar and persist it after reload", async () => {
        const name = `Format ${Math.floor(Math.random() * 10000)}`;
        const content = `E2E formatting ${Date.now()}`;
        const docId = await notepad.addNew(name);
        try {
            await notepad.setContent(content);

            await notepad.applyTextMark("tip-tap-bold");
            await notepad.applyTextMark("tip-tap-italic");

            const savePromise = notepad.waitForNotepadSave();
            await notepad.applyBulletList();
            await savePromise;

            await page.reload();
            await notepad.editor.waitFor({ state: "visible" });
            await expect(notepad.editor).toContainText(content);

            const html = await notepad.getEditorHtml();
            expect(html).toContain("<strong>");
            expect(html).toContain("<em>");
            expect(html).toMatch(/<ul|<li/);
        } finally {
            await getDb().cleanupDocument(docId);
        }
    });

    test("shows the privacy indicator on a private notepad and persists it after reload", async () => {
        const permissions = new PermissionsPage(page);
        const name = `Private ${Math.floor(Math.random() * 10000)}`;
        const notepadId = await notepad.addNew(name);
        try {
            await permissions.makeDocumentPrivate(notepadId);

            // Force a fresh load so the store reflects the private permission.
            await page.reload();
            await notepad.openByName(name);
            await expect(notepad.privacyButton).toBeVisible();

            // Persists across another reload.
            await page.reload();
            await notepad.openByName(name);
            await expect(notepad.privacyButton).toBeVisible();
        } finally {
            await getDb().cleanupDocument(notepadId);
        }
    });
});
