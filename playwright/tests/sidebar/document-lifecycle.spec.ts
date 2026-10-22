import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Sidebar from "../../pages/sidebar";
import Project from "../../pages/project";
import Notepad from "../../pages/notepad";
import BoardView from "../../pages/boardView";
import { closeDb, getDb } from "../../fixtures/db";

const TOKEN = `e2e-sidebar-${Date.now()}`;

test.describe("Sidebar - Document lifecycle", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let sidebar: Sidebar;
    let project: Project;
    let notepad: Notepad;
    let board: BoardView;

    const documentIds: string[] = [];
    const projectIds: string[] = [];

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });

        sidebar = new Sidebar(page);
        project = new Project(page);
        notepad = new Notepad(page);
        board = new BoardView(page);
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
        for (const projectId of projectIds) await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        for (const documentId of documentIds) await attempt(() => getDb().cleanupDocument(documentId));
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        await attempt(closeDb);
        if (errors.length) throw new AggregateError(errors, "Sidebar document lifecycle cleanup failed");
    });

    test("Should rename a notepad from the document menu and keep the new title after reload", async () => {
        const id = await notepad.addNew(`${TOKEN} rename-target`);
        documentIds.push(id);
        await sidebar.expectDocumentTitle(id, `${TOKEN} rename-target`);

        await sidebar.renameDocument(id, `${TOKEN} renamed-title`);
        await sidebar.expectDocumentTitle(id, `${TOKEN} renamed-title`);

        await sidebar.reload();
        await sidebar.expectDocumentTitle(id, `${TOKEN} renamed-title`);
    });

    test("Should keep the original title when the rename is cancelled with Escape", async () => {
        const title = `${TOKEN} escape-cancel`;
        const id = await notepad.addNew(title);
        documentIds.push(id);

        await sidebar.cancelRenameWithEscape(id, `${TOKEN} typed-title`);
        await sidebar.expectDocumentTitle(id, title);
    });

    test("Should archive a notepad out of the tree and list it in the archives dialog after reload", async () => {
        const id = await notepad.addNew(`${TOKEN} archive-target`);
        documentIds.push(id);

        await sidebar.archiveDocumentById(id);
        await sidebar.expectDocumentAbsent(id);
        await sidebar.openArchivesDialog();
        await sidebar.expectArchivedRow(id);
        await sidebar.closeArchivesDialog();

        await sidebar.reload();
        await sidebar.expectDocumentAbsent(id);
        await sidebar.openArchivesDialog();
        await sidebar.expectArchivedRow(id);
        await sidebar.closeArchivesDialog();
    });

    test("Should restore an archived notepad from the archives dialog back into the tree", async () => {
        const id = await notepad.addNew(`${TOKEN} restore-target`);
        documentIds.push(id);

        await sidebar.archiveDocumentById(id);
        await sidebar.openArchivesDialog();
        await sidebar.selectArchivedRow(id);
        await sidebar.restoreSelectedArchived(id);
        await sidebar.expectDocumentPresent(id);
    });

    test("Should keep the record when the delete dialog is cancelled", async () => {
        const title = `${TOKEN} delete-cancel`;
        const id = await notepad.addNew(title);
        documentIds.push(id);

        await sidebar.deleteDocumentWithCancel(id);
        await sidebar.expectDocumentPresent(id);
        await sidebar.expectDocumentTitle(id, title);
    });

    test("Should delete a folder together with its child notepad", async () => {
        const folderName = `${TOKEN} cascade-folder`;
        const folderId = await sidebar.addNewFolder(folderName);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const childTitle = `${TOKEN} cascade-child`;
        const childId = await notepad.addNew(childTitle);
        documentIds.push(childId);
        await sidebar.expectDocumentPresent(childId);

        await sidebar.deleteFolderById(folderId);
        await sidebar.expectFolderAbsent(folderId);
        await sidebar.expectDocumentAbsent(childId);
    });

    test("Should leave scenario tasks behind when the project document is deleted", async () => {
        const projectName = `${TOKEN} cascade-project`;
        const projectId = await project.addNew({ name: projectName });
        projectIds.push(projectId);
        documentIds.push(projectId);

        const stackId = await board.addColumn(`${TOKEN} stack`);
        const taskTitle = `${TOKEN} orphan-task`;
        await board.addTaskToStack(stackId, taskTitle);
        const taskId = await board.getCardIdByName(taskTitle);

        await sidebar.deleteDocument(projectName);

        const counts = await getDb().getTaskRecordCounts(taskId);
        expect(counts.tasks, `Task ${taskId} was removed by the document delete`).toBe(1);
    });

    test("Should reorder children by dragging one onto the parent folder", async () => {
        const folderName = `${TOKEN} reorder-folder`;
        const folderId = await sidebar.addNewFolder(folderName);
        documentIds.push(folderId);

        await sidebar.openFolderById(folderId);
        const firstId = await notepad.addNew(`${TOKEN} reorder-first`);
        documentIds.push(firstId);
        const secondId = await notepad.addNew(`${TOKEN} reorder-second`);
        documentIds.push(secondId);
        await sidebar.expectDocumentAbove(firstId, secondId);

        await sidebar.dragDocumentOnto(secondId, folderId);
        await sidebar.expectDocumentAbove(secondId, firstId);
    });
});
