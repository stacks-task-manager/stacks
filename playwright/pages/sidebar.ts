import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import { NewBookmarkDialog } from "./components/NewBookmarkDialog";

export type DocumentType = "folder" | "project" | "task" | "notepad" | "file" | "bookmark" | "logtime";
export type SidebarPages = "home" | "people" | "inbox" | "bookmarks" | "calendar" | "myTasks" | "reports";

class Sidebar extends Base {
    public page: Page;
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

    constructor(page: Page) {
        super(page);

        this.page = page;

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

    public async addNewFolder(folderName: string) {
        await this.addNew("folder");
        await this.newFolderDialog.waitFor({ state: "visible" });
        await this.newFolderInput.fill(folderName);
        await this.newFolderSaveButton.click();
        await this.newFolderDialog.waitFor({ state: "hidden" });
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

    public async go(title: string) {
        const pinnedItem = this.pinnedItems.filter({ hasText: title });
        if ((await pinnedItem.count()) > 0) {
            await pinnedItem.click();
        } else {
            await this.moreButton.click();
            await this.moreMenu.getByRole("menuitem", { name: title }).click();
        }
    }
}
export default Sidebar;
