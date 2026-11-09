import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import { NewBookmarkDialog } from "./components/NewBookmarkDialog";

export type DocumentType = "folder" | "project" | "task" | "notepad" | "file" | "bookmark" | "logtime";
export type SidebarPages = "home" | "people" | "inbox" | "bookmarks" | "calendar" | "myTasks" | "reports";

class Sidebar extends Base {
    public sidebar: Locator;
    public toggleButton: Locator;
    public pinnedItemsWrapper: Locator;
    public pinnedItems: Locator;
    public sidebarBody: Locator;
    public documentsTree: Locator;
    public documentsTreeItems: Locator;

    // General pinned buttons
    public homeButton: Locator;
    public peopleButton: Locator;
    public inboxButton: Locator;
    public bookmarksButton: Locator;
    public jumptoButton: Locator;
    public calendarButton: Locator;
    public myTasksButton: Locator;
    public reportsButton: Locator;

    // Menu items
    public homeMenuItem: Locator;
    public peopleMenuItem: Locator;
    public inboxMenuItem: Locator;
    public bookmarksMenuItem: Locator;
    public jumptoMenuItem: Locator;
    public calendarMenuItem: Locator;
    public myTasksMenuItem: Locator;
    public reportsMenuItem: Locator;
    public managePinnedMenuItem: Locator;

    public moreButton: Locator;
    public moreMenu: Locator;
    public quickAddButton: Locator;
    public quickAddMenu: Locator;

    // Documents adder menu items
    public newFolderItem: Locator;
    public newProjectItem: Locator;
    public newTaskItem: Locator;
    public newNotepadItem: Locator;
    public newFileItem: Locator;
    public newBookmarkItem: Locator;
    public newLogtimeItem: Locator;
    public showArchivesItem: Locator;

    // Dialogs
    public newFolderDialog: Locator;
    public newFolderInput: Locator;
    public newFolderCancelButton: Locator;
    public newFolderSaveButton: Locator;
    public newBookmarkDialog: NewBookmarkDialog;
    public archivesDialog: Locator;
    public archivesRestoreButton: Locator;
    public archivesCloseButton: Locator;
    public archivesDeleteButton: Locator;

    constructor(page: Page) {
        super(page);

        this.sidebar = page.getByTestId("sidebar");
        this.toggleButton = this.sidebar.getByTestId("toggle-sidebar-button");
        this.pinnedItemsWrapper = this.sidebar.getByTestId("sidebar-pinned-items");
        this.pinnedItems = this.pinnedItemsWrapper.getByRole("treeitem");
        this.sidebarBody = this.sidebar.getByTestId("sidebar-body");
        this.documentsTree = this.sidebar.getByTestId("documents-tree");
        this.documentsTreeItems = this.documentsTree.getByRole("listitem");

        // General pinned buttons
        this.homeButton = this.pinnedItems.getByTestId("home-button");
        this.peopleButton = this.pinnedItems.getByTestId("people-button");
        this.inboxButton = this.pinnedItems.getByTestId("inbox-button");
        this.bookmarksButton = this.pinnedItems.getByTestId("bookmarks-button");
        this.jumptoButton = this.pinnedItems.getByTestId("jumpto-button");
        this.calendarButton = this.pinnedItems.getByTestId("calendar-button");
        this.myTasksButton = this.pinnedItems.getByTestId("mytasks-button");
        this.reportsButton = this.pinnedItems.getByTestId("reports-button");

        // Menu items
        this.homeMenuItem = page.getByTestId("home-menuitem");
        this.peopleMenuItem = page.getByTestId("people-menuitem");
        this.inboxMenuItem = page.getByTestId("inbox-menuitem");
        this.bookmarksMenuItem = page.getByTestId("bookmakrs-menuitem");
        this.jumptoMenuItem = page.getByTestId("jumpto-menuitem");
        this.calendarMenuItem = page.getByTestId("calendar-menuitem");
        this.myTasksMenuItem = page.getByTestId("myTasks-menuitem");
        this.reportsMenuItem = page.getByTestId("reports-menuitem");
        this.managePinnedMenuItem = page.getByTestId("manage-pinned-menuitem");

        this.moreButton = this.sidebar.getByTestId("more-button");
        this.moreMenu = page.getByTestId("more-menu"); // using page because it is rendered in a portal
        this.quickAddButton = this.sidebar.getByTestId("quick-add-button");
        this.quickAddMenu = page.getByTestId("quick-add-menu"); // using page because it is rendered in a portal

        // Documents adder menu items
        this.newFolderItem = this.quickAddMenu.getByTestId("new-folder-item");
        this.newProjectItem = this.quickAddMenu.getByTestId("new-project-item");
        this.newTaskItem = this.quickAddMenu.getByTestId("new-task-item");
        this.newNotepadItem = this.quickAddMenu.getByTestId("new-notepad-item");
        this.newFileItem = this.quickAddMenu.getByTestId("new-file-item");
        this.newBookmarkItem = this.quickAddMenu.getByTestId("new-bookmark-item");
        this.newLogtimeItem = this.quickAddMenu.getByTestId("new-logtime-item");
        this.showArchivesItem = this.quickAddMenu.getByTestId("show-archives-item");

        // Dialogs
        this.newFolderDialog = page.locator('[aria-labelledby="new-folder-dialog"]');
        this.newFolderInput = this.newFolderDialog.getByTestId("new-folder-input");
        this.newFolderCancelButton = this.newFolderDialog.getByTestId("new-folder-cancel-button");
        this.newFolderSaveButton = this.newFolderDialog.getByTestId("new-folder-save-button");
        this.newBookmarkDialog = new NewBookmarkDialog(this.page);

        this.archivesDialog = page.locator('[aria-labelledby="archived-documents-dialog"]');
        this.archivesRestoreButton = this.archivesDialog.getByTestId(
            "archived-documents-dialog-restore-button"
        );
        this.archivesCloseButton = this.archivesDialog.getByTestId("archived-documents-dialog-close-button");
        this.archivesDeleteButton = this.archivesDialog.getByTestId(
            "archived-documents-dialog-delete-button"
        );
    }

    public async addNew(documentType: DocumentType) {
        await this.quickAddButton.click();
        await this.quickAddMenu.waitFor({ state: "visible" });

        switch (documentType) {
            case "folder":
                await this.newFolderItem.click();
                break;
            case "project":
                await this.newProjectItem.click();
                break;
            case "task":
                await this.newTaskItem.click();
                break;
            case "notepad":
                await this.newNotepadItem.click();
                break;
            case "file":
                await this.newFileItem.click();
                break;
            case "bookmark":
                await this.newBookmarkItem.click();
                break;
            case "logtime":
                await this.newLogtimeItem.click();
                break;
        }

        await this.quickAddMenu.waitFor({ state: "hidden" });
    }

    public async deleteDocument(title: string) {
        const document = this.documentsTree.getByRole("treeitem", { name: title, exact: true });
        await document.hover();

        const contextButton = document.getByTestId("sidebar-button-context-button");
        await contextButton.click({ force: true });

        await this.page.getByTestId("sidebar-document-menu").waitFor({ state: "visible" });
        await this.page.getByRole("menuitem", { name: "Delete..." }).click();

        const dialog = await this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });

        await expect(dialog.getByTestId("confirm-dialog-title")).toHaveText("Delete record");
        await expect(dialog.getByTestId("confirm-dialog-description")).toHaveText(
            "Are you sure you want to delete this record? This action cannot be undone!"
        );

        await dialog.getByRole("button", { name: "Yes" }).click();
        await dialog.waitFor({ state: "hidden" });
    }

    public async addNewFolder(folderName: string, onCreated?: () => void) {
        await this.addNew("folder");
        await this.newFolderDialog.waitFor({ state: "visible" });
        await this.newFolderInput.fill(folderName);
        const created = this.page.waitForResponse(
            response =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/api/documents"
        );
        await this.newFolderSaveButton.click();
        const response = await created;
        if (response.ok()) onCreated?.();
        expect(response.ok()).toBeTruthy();
        await this.newFolderDialog.waitFor({ state: "hidden" });
        const { data } = await response.json();
        return data?.id;
    }

    public async expectFolderCount(title: string, count: number) {
        await expect(this.documentsTreeItems.filter({ hasText: title })).toHaveCount(count);
    }

    public async deleteFolder(title: string) {
        const documentItem = this.documentsTreeItems.filter({ hasText: title });
        const contextButton = documentItem.first();
        await contextButton.hover();
        await contextButton.getByTestId("sidebar-button-context-button").click();

        await this.page.getByTestId("sidebar-folder-menu").waitFor({ state: "visible" });
        await this.page.getByRole("menuitem", { name: "Delete folder..." }).click();

        const dialog = await this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });

        await expect(dialog.getByTestId("confirm-dialog-title")).toHaveText("Delete folder");
        await expect(dialog.getByTestId("confirm-dialog-description")).toHaveText(
            "Are you sure you want to delete this folder? All boards, stacks and tasks will also be deleted! This action cannot be undone!"
        );

        await dialog.getByRole("button", { name: "Yes" }).click();
        await dialog.waitFor({ state: "hidden" });
    }

    public async deleteFolderById(folderId: string) {
        const folder = this.folderItem(folderId);
        await folder.hover();
        await folder.getByTestId("sidebar-button-context-button").click({ force: true });
        await this.page.getByTestId("sidebar-folder-menu").waitFor({ state: "visible" });
        await this.page.getByRole("menuitem", { name: "Delete folder..." }).click();
        const dialog = await this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });
        await expect(dialog.getByTestId("confirm-dialog-title")).toHaveText("Delete folder");
        await expect(dialog.getByTestId("confirm-dialog-description")).toHaveText(
            "Are you sure you want to delete this folder? All boards, stacks and tasks will also be deleted! This action cannot be undone!"
        );
        await dialog.getByRole("button", { name: "Yes" }).click();
        await dialog.waitFor({ state: "hidden" });
    }

    public async go(title: string) {
        const pinnedItem = this.pinnedItems.filter({ hasText: title });
        if ((await pinnedItem.count()) > 0) {
            await pinnedItem.click();
        } else {
            await this.moreButton.click();
            await this.moreMenu.getByRole("menuitem", { name: title }).click();
        }
    }

    public documentMenu(): Locator {
        return this.page.getByTestId("sidebar-document-menu");
    }

    public documentItem(documentId: string): Locator {
        return this.documentsTree.getByTestId(`sidebar-document-${documentId}`);
    }

    public folderItem(folderId: string): Locator {
        return this.documentsTree.getByTestId(`sidebar-folder-${folderId}`);
    }

    public async openDocumentMenu(documentId: string) {
        const document = this.documentItem(documentId);
        await document.hover();
        await document.getByTestId("sidebar-button-context-button").click({ force: true });
        await this.documentMenu().waitFor({ state: "visible" });
    }

    public async closeDocumentMenu() {
        await this.documentMenu().waitFor({ state: "hidden" });
    }

    public async openDocumentDialog(
        documentId: string,
        menuName: string,
        dialogTitle: string,
        dialogDescription: string
    ) {
        await this.openDocumentMenu(documentId);
        await this.page.getByRole("menuitem", { name: menuName }).click();

        const dialog = await this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });
        await expect(dialog.getByTestId("confirm-dialog-title")).toHaveText(dialogTitle);
        await expect(dialog.getByTestId("confirm-dialog-description")).toHaveText(dialogDescription);
    }

    public async confirmDocumentDialog(documentId: string, endpoint: string) {
        const dialog = await this.page.getByRole("alertdialog");
        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === `/api/documents/${endpoint}`
        );
        await dialog.getByTestId("confirm-dialog-confirm-button").click();
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        await dialog.waitFor({ state: "hidden" });
    }

    public async cancelDocumentDialog() {
        const dialog = await this.page.getByRole("alertdialog");
        await dialog.getByTestId("confirm-dialog-cancel-button").click();
        await dialog.waitFor({ state: "hidden" });
    }

    public async renameDocument(documentId: string, newTitle: string) {
        await this.openDocumentMenu(documentId);
        await this.page.getByRole("menuitem", { name: "Rename" }).click();

        const input = this.documentItem(documentId).getByTestId("sidebar-button-input");
        await input.waitFor({ state: "visible" });

        const renamed = this.page.waitForResponse(
            (response: any) =>
                response.request().method() === "PATCH" &&
                new URL(response.url()).pathname === `/api/documents/${documentId}`
        );
        await input.fill(newTitle);
        await input.press("Enter");
        const response = await renamed;
        expect(response.ok()).toBeTruthy();
        await this.closeDocumentMenu();
    }

    public async cancelRenameWithEscape(documentId: string, typedTitle: string) {
        await this.openDocumentMenu(documentId);
        await this.page.getByRole("menuitem", { name: "Rename" }).click();

        const input = this.documentItem(documentId).getByTestId("sidebar-button-input");
        await input.waitFor({ state: "visible" });
        await input.fill(typedTitle);
        await input.press("Escape");
        await this.closeDocumentMenu();
    }

    public async archiveDocumentById(documentId: string) {
        await this.openDocumentDialog(
            documentId,
            "Archive...",
            "Archive record",
            "Are you sure you want to archive this record?"
        );
        await this.confirmDocumentDialog(documentId, `${documentId}/archive`);
    }

    public async unarchiveDocumentById(documentId: string) {
        await this.openDocumentDialog(
            documentId,
            "Unarchive...",
            "Unarchive record",
            "Are you sure you want to unarchive this record?"
        );
        await this.confirmDocumentDialog(documentId, `${documentId}/unarchive`);
    }

    public async deleteDocumentWithCancel(documentId: string) {
        await this.openDocumentDialog(
            documentId,
            "Delete...",
            "Delete record",
            "Are you sure you want to delete this record? This action cannot be undone!"
        );
        await this.cancelDocumentDialog();
    }

    public async expectDocumentTitle(documentId: string, title: string) {
        await expect(this.documentItem(documentId)).toHaveAccessibleName(title);
    }

    public async expectDocumentPresent(documentId: string) {
        await expect(this.documentItem(documentId)).toHaveCount(1);
    }

    public async expectDocumentAbsent(documentId: string) {
        await expect(this.documentItem(documentId)).toHaveCount(0);
    }

    public async expectFolderPresent(folderId: string) {
        await expect(this.folderItem(folderId)).toHaveCount(1);
    }

    public async expectFolderAbsent(folderId: string) {
        await expect(this.folderItem(folderId)).toHaveCount(0);
    }

    public async openFolderById(folderId: string) {
        await this.folderItem(folderId).click();
    }

    public async openArchivesDialog() {
        await this.quickAddButton.click();
        await this.quickAddMenu.waitFor({ state: "visible" });
        await this.showArchivesItem.click();
        await this.archivesDialog.waitFor({ state: "visible" });
    }

    public async closeArchivesDialog() {
        await this.archivesCloseButton.click();
        await this.archivesDialog.waitFor({ state: "hidden" });
    }

    public async expectArchivedRow(documentId: string) {
        await expect(
            this.archivesDialog.getByTestId(`table-archived-documents-row-${documentId}`)
        ).toBeVisible();
    }

    public async expectArchivedRowAbsent(documentId: string) {
        await expect(
            this.archivesDialog.getByTestId(`table-archived-documents-row-${documentId}`)
        ).toHaveCount(0);
    }

    public async selectArchivedRow(documentId: string) {
        const selection = this.archivesDialog.getByTestId(
            `table-archived-documents-row-select-${documentId}-click-target`
        );
        await selection.waitFor({ state: "visible" });
        await selection.click();
    }

    public async restoreSelectedArchived(documentId: string) {
        await this.archivesRestoreButton.click();

        const dialog = await this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });
        await expect(dialog.getByTestId("confirm-dialog-title")).toHaveText("Unarchive documents");
        await expect(dialog.getByTestId("confirm-dialog-description")).toHaveText(
            "Are you sure you want to unarchive the selected documents?"
        );

        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === `/api/documents/${documentId}/unarchive`
        );
        await dialog.getByTestId("confirm-dialog-confirm-button").click();
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        await dialog.waitFor({ state: "hidden" });
    }

    public async reload() {
        await this.page.reload({ waitUntil: "networkidle" });
        await this.sidebar.waitFor({ state: "visible" });
    }

    public async dragDocumentOnto(documentId: string, folderId: string) {
        const sourceBox = await this.documentItem(documentId).boundingBox();
        const targetBox = await this.folderItem(folderId).boundingBox();
        if (!sourceBox || !targetBox) {
            throw new Error(`Cannot drag document ${documentId} because a tree row has no bounding box`);
        }
        const mouse = this.page.mouse;

        const responsePromise = this.page.waitForResponse(
            (response: any) =>
                response.request().method() === "PATCH" &&
                new URL(response.url()).pathname === `/api/documents/${documentId}`
        );

        await mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height * 0.75);
        await mouse.down();
        await mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.75, {
            steps: 12,
        });
        await mouse.up();

        const response = await responsePromise;
        expect(
            response.ok(),
            `Document reorder PATCH returned ${response.status()}: ${await response.text()}`
        ).toBeTruthy();
    }

    public async expectDocumentAbove(aboveId: string, belowId: string) {
        const aboveBox = await this.documentItem(aboveId).boundingBox();
        const belowBox = await this.documentItem(belowId).boundingBox();
        if (!aboveBox || !belowBox) {
            throw new Error(
                `Cannot compare order of ${aboveId} and ${belowId} because a tree row has no bounding box`
            );
        }
        expect(aboveBox.y, `Document ${aboveId} is not rendered above ${belowId}`).toBeLessThan(belowBox.y);
    }
}
export default Sidebar;
