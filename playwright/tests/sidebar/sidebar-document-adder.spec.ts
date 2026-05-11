import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Sidebar from "../../pages/sidebar";
import Project from "../../pages/project";
import Notepad from "../../pages/notepad";

test.describe("Sidebar - Document adder", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let sidebar: Sidebar;
    let project: Project;
    let notepad: Notepad;

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });

        sidebar = new Sidebar(page);
        project = new Project(page);
        notepad = new Notepad(page);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) {
            await page.close();
        }

        if (context) {
            await context.close();
        }

        if (browser) {
            await browser.close();
        }
    });

    test("Should show the quick add menu", async () => {
        await sidebar.quickAddButton.click();
        await expect(sidebar.quickAddMenu).toBeVisible();

        const menuItems = sidebar.quickAddMenu.getByRole("menuitem");
        const menuItemLabels = await menuItems.allTextContents();
        await expect(menuItemLabels).toEqual([
            expect.stringMatching(/^Folder/),
            expect.stringMatching(/^Project/),
            expect.stringMatching(/^Task/),
            expect.stringMatching(/^Notepad/),
            expect.stringMatching(/^File/),
            expect.stringMatching(/^Bookmark/),
            expect.stringMatching(/^Log time/),
            expect.stringMatching(/^Show Archives/),
        ]);
    });

    test("Should add a new folder", async () => {
        const TEST_FOLDER = "Test Folder";
        await sidebar.addNewFolder(TEST_FOLDER);
        const matchingFolders = sidebar.documentsTreeItems.filter({ hasText: TEST_FOLDER });
        await expect(matchingFolders).toHaveCount(1);

        // delete the folder
        await sidebar.deleteFolder(TEST_FOLDER);
        await expect(matchingFolders).toHaveCount(0);
    });

    test("Should add documents using the quick add menu hotkeys", async () => {
        await sidebar.sidebar.click();

        async function showQuickAddMenu() {
            await page.keyboard.press("q");
            await sidebar.quickAddMenu.waitFor({ state: "visible" });
            await expect(sidebar.quickAddMenu).toBeVisible();
            await page.waitForTimeout(500);
        }

        // should show the new folder dialog
        await showQuickAddMenu();
        await page.keyboard.press("f");
        await expect(sidebar.newFolderDialog).toBeVisible();
        await sidebar.newFolderCancelButton.click();
        await expect(sidebar.newFolderDialog).toBeHidden();

        // should show the new project dialog
        await showQuickAddMenu();
        await page.keyboard.press("p");
        await expect(project.newProjectDialog.dialog).toBeVisible();
        await project.newProjectDialog.cancelButton.click();
        await expect(project.newProjectDialog.dialog).toBeHidden();

        // should show the new task dialog
        await showQuickAddMenu();
        await page.keyboard.press("t");
        await expect(project.newTaskDialog.dialog).toBeVisible();
        await project.newTaskDialog.cancelButton.click();
        await expect(project.newTaskDialog.dialog).toBeHidden();

        // should show the new notepad dialog
        await showQuickAddMenu();
        await page.keyboard.press("n");
        await expect(notepad.newNotepadDialog.dialog).toBeVisible();
        await notepad.newNotepadDialog.cancelButton.click();
        await expect(notepad.newNotepadDialog.dialog).toBeHidden();

        // add assert for adding a new file

        // should show the new bookmark dialog
        await showQuickAddMenu();
        await page.keyboard.press("b");
        await expect(sidebar.newBookmarkDialog.dialog).toBeVisible();
        await sidebar.newBookmarkDialog.cancelButton.click();
        await expect(sidebar.newBookmarkDialog.dialog).toBeHidden();

        // should show the new timelog dialog
        await showQuickAddMenu();
        await page.keyboard.press("l");
        await expect(project.timelogDialog.dialog).toBeVisible();
        await project.timelogDialog.quickTimelog.cancelButton.click();
        await expect(project.timelogDialog.dialog).toBeHidden();

        // should show the archives dialog
        await showQuickAddMenu();
        await page.keyboard.press("s");
        const archivesDialog = page.locator('[aria-labelledby="archived-documents-dialog"]');
        await expect(archivesDialog).toBeVisible();
        await archivesDialog.getByTestId("archived-documents-dialog-close-button").click();
        await expect(archivesDialog).toBeHidden();
    });
});
