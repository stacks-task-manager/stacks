// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Sidebar from "../../pages/sidebar";
import Notepad from "../../pages/notepad";
import { closeDb, getDb } from "../../fixtures/db";

const TOKEN = `e2e-tree-dnd-${Date.now()}`;

test.describe("Sidebar - Documents tree drag and drop", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let sidebar: Sidebar;
    let notepad: Notepad;

    const documentIds: string[] = [];

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });

        sidebar = new Sidebar(page);
        notepad = new Notepad(page);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        for (const documentId of documentIds) await attempt(() => getDb().cleanupDocument(documentId));
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        await attempt(closeDb);
        if (errors.length) throw new AggregateError(errors, "Sidebar documents tree dnd cleanup failed");
    });

    test("Persists expanded and collapsed folders across reload", async () => {
        const folderId = await sidebar.addNewFolder(`${TOKEN} persist-folder`);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const childId = await notepad.addNew(`${TOKEN} persist-child`);
        documentIds.push(childId);

        // Open: child is rendered.
        await expect(sidebar.documentItem(childId)).toHaveCount(1);

        // Collapse, then reload: the closed state is restored.
        await sidebar.openFolderById(folderId);
        await expect(sidebar.documentItem(childId)).toHaveCount(0);

        await sidebar.reload();
        await expect(sidebar.documentItem(childId)).toHaveCount(0);

        // Expand, then reload: the open state is restored.
        await sidebar.openFolderById(folderId);
        await expect(sidebar.documentItem(childId)).toHaveCount(1);

        await sidebar.reload();
        await expect(sidebar.documentItem(childId)).toHaveCount(1);
    });

    test("Drops onto a closed folder's middle as the first child", async () => {
        const folderId = await sidebar.addNewFolder(`${TOKEN} closed-folder`);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const firstId = await notepad.addNew(`${TOKEN} closed-first`);
        const secondId = await notepad.addNew(`${TOKEN} closed-second`);
        documentIds.push(firstId, secondId);

        // Deselect the folder so the next document lands at the root.
        await sidebar.documentItem(firstId).click();
        const rootId = await notepad.addNew(`${TOKEN} closed-root`);
        documentIds.push(rootId);

        await sidebar.openFolderById(folderId); // select + collapse

        await sidebar.dragTreeRowToPosition(rootId, folderId, "middle");

        // The folder stays closed: the dropped document is hidden inside it.
        await expect(sidebar.documentItem(rootId)).toHaveCount(0);
        await sidebar.openFolderById(folderId);
        await sidebar.expectDocumentAbove(rootId, firstId);
        await sidebar.expectDocumentAbove(firstId, secondId);
    });

    test("Reorders children by dragging over the top zone of a sibling", async () => {
        const folderId = await sidebar.addNewFolder(`${TOKEN} reorder-folder`);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const firstId = await notepad.addNew(`${TOKEN} reorder-first`);
        const secondId = await notepad.addNew(`${TOKEN} reorder-second`);
        documentIds.push(firstId, secondId);
        await sidebar.expectDocumentAbove(firstId, secondId);

        // Same parent: second moves above first.
        await sidebar.dragTreeRowToPosition(secondId, firstId, "top");
        await sidebar.expectDocumentAbove(secondId, firstId);

        // Across parents: first leaves the folder and lands directly above the root document, keeping
        // the root document that follows it in place. The flat-index mapping used to slip past that
        // document (nested rows inflate flat positions) and only a relative assertion hid it.
        await sidebar.documentItem(firstId).click();
        const rootId = await notepad.addNew(`${TOKEN} reorder-root`);
        documentIds.push(rootId);
        const afterRootId = await notepad.addNew(`${TOKEN} reorder-root-after`);
        documentIds.push(afterRootId);
        await sidebar.expectDocumentAbove(rootId, afterRootId);

        await sidebar.dragTreeRowToPosition(firstId, rootId, "top");
        await sidebar.expectDocumentAbove(firstId, rootId);
        await sidebar.expectDocumentAbove(rootId, afterRootId);
    });

    test("Keeps archived siblings from shifting a root drop", async () => {
        // Archived documents keep their `order` but the tree stops rendering them, so a drop slot
        // among the visible rows is not an order value. Three hidden rows between two visible ones
        // used to leave the moved row that many positions above where it was dropped.
        const firstId = await notepad.addNew(`${TOKEN} hidden-first`);
        const hiddenA = await notepad.addNew(`${TOKEN} hidden-a`);
        const hiddenB = await notepad.addNew(`${TOKEN} hidden-b`);
        const hiddenC = await notepad.addNew(`${TOKEN} hidden-c`);
        const lastId = await notepad.addNew(`${TOKEN} hidden-last`);
        documentIds.push(firstId, hiddenA, hiddenB, hiddenC, lastId);

        await sidebar.archiveDocumentById(hiddenA);
        await sidebar.archiveDocumentById(hiddenB);
        await sidebar.archiveDocumentById(hiddenC);
        await sidebar.expectDocumentAbsent(hiddenA);
        await sidebar.expectDocumentAbove(firstId, lastId);

        // Drop the first root document under the last visible one.
        await sidebar.dragTreeRowToPosition(firstId, lastId, "bottom");
        await sidebar.expectDocumentAbove(lastId, firstId);
    });

    test("Places a row below the row it is dropped under", async () => {
        const folderId = await sidebar.addNewFolder(`${TOKEN} downward-folder`);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const firstId = await notepad.addNew(`${TOKEN} downward-first`);
        const secondId = await notepad.addNew(`${TOKEN} downward-second`);
        const thirdId = await notepad.addNew(`${TOKEN} downward-third`);
        documentIds.push(firstId, secondId, thirdId);

        // Downward by one row: first lands directly under second, not under third as well.
        await sidebar.dragTreeRowToPosition(firstId, secondId, "bottom");
        await sidebar.expectDocumentAbove(secondId, firstId);
        await sidebar.expectDocumentAbove(firstId, thirdId);

        // Downward to the end: first lands under third.
        await sidebar.dragTreeRowToPosition(firstId, thirdId, "bottom");
        await sidebar.expectDocumentAbove(secondId, thirdId);
        await sidebar.expectDocumentAbove(thirdId, firstId);

        // Upward back to the top: first lands above second, which also proves the row did not
        // stop one position short of the line it was dropped on.
        await sidebar.dragTreeRowToPosition(firstId, secondId, "top");
        await sidebar.expectDocumentAbove(firstId, secondId);
        await sidebar.expectDocumentAbove(secondId, thirdId);
    });

    test("Opens a closed folder ~500 ms after hovering it during a drag", async () => {
        const folderId = await sidebar.addNewFolder(`${TOKEN} autoopen-folder`);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const childId = await notepad.addNew(`${TOKEN} autoopen-child`);
        documentIds.push(childId);

        await sidebar.documentItem(childId).click();
        const rootId = await notepad.addNew(`${TOKEN} autoopen-root`);
        documentIds.push(rootId);

        await sidebar.openFolderById(folderId); // select + collapse

        // Hovering the closed folder long enough auto-opens it before the drop.
        await sidebar.dragTreeRowWithHover(rootId, folderId, "middle", 900);
        await expect(sidebar.documentItem(childId)).toHaveCount(1);
        await sidebar.expectDocumentAbove(rootId, childId);
    });

    test("Shows no placeholder and issues no reorder for an invalid target", async () => {
        const folderId = await sidebar.addNewFolder(`${TOKEN} invalid-folder`);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const childId = await notepad.addNew(`${TOKEN} invalid-child`);
        documentIds.push(childId);

        await sidebar.documentItem(childId).click();
        const rootId = await notepad.addNew(`${TOKEN} invalid-root`);
        documentIds.push(rootId);

        let patchIssued = false;
        const onResponse = (response: any) => {
            if (response.request().method() === "PATCH" && response.url().includes("/api/documents/")) {
                patchIssued = true;
            }
        };
        page.on("response", onResponse);
        try {
            await sidebar.documentItem(rootId).scrollIntoViewIfNeeded();
            await sidebar.documentItem(childId).scrollIntoViewIfNeeded();
            const sourceBox = await sidebar.documentItem(rootId).boundingBox();
            const targetBox = await sidebar.documentItem(childId).boundingBox();
            if (!sourceBox || !targetBox) throw new Error("Missing tree row bounding box");

            // A document row has no child list, so its middle band is not a drop target: the top and
            // bottom bands both insert as siblings, but there is nothing to drop *into* a document.
            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.5, {
                steps: 12,
            });
            // Chromium coalesces the `dragover` events of a multi-step synthetic move: let the frame
            // settle and restate the position so the invalid zone is resolved before asserting.
            await page.waitForTimeout(100);
            await page.mouse.move(
                targetBox.x + targetBox.width / 2,
                targetBox.y + targetBox.height * 0.5 + 1
            );
            await page.waitForTimeout(300);
            await expect(page.locator(".tree-placeholder")).toHaveCount(0);
            await page.mouse.up();
        } finally {
            page.off("response", onResponse);
        }
        expect(patchIssued).toBe(false);
    });

    test("Keeps the inline rename input free of drag behaviour", async () => {
        const rootId = await notepad.addNew(`${TOKEN} rename-guard`);
        documentIds.push(rootId);
        const otherId = await notepad.addNew(`${TOKEN} rename-guard-other`);
        documentIds.push(otherId);

        await sidebar.openDocumentMenu(rootId);
        await page.getByRole("menuitem", { name: "Rename" }).click();
        const input = sidebar.documentItem(rootId).getByTestId("sidebar-button-input");
        await input.waitFor({ state: "visible" });
        await input.click(); // closes the menu, keeps the input focused

        let patchIssued = false;
        const onResponse = (response: any) => {
            if (
                response.request().method() === "PATCH" &&
                new URL(response.url()).pathname === `/api/documents/${rootId}`
            ) {
                patchIssued = true;
            }
        };
        page.on("response", onResponse);
        try {
            await sidebar.documentItem(otherId).scrollIntoViewIfNeeded();
            const inputBox = await input.boundingBox();
            const targetBox = await sidebar.documentItem(otherId).boundingBox();
            if (!inputBox || !targetBox) throw new Error("Missing bounding box");

            // Dragging from the rename input selects text instead of starting a row drag.
            await page.mouse.move(inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
                steps: 10,
            });
            await page.waitForTimeout(100);
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2 + 1);
            await page.waitForTimeout(300);
            await expect(page.locator(".tree-placeholder")).toHaveCount(0);
            await page.mouse.up();
        } finally {
            page.off("response", onResponse);
        }
        expect(patchIssued).toBe(false);
        await expect(input).toBeVisible();
        await input.press("Escape");
    });
});
