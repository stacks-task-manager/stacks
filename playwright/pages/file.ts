import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import Sidebar from "./sidebar";

/**
 * W5 — /file/:id view + FileMenu.
 *
 * Covers the quick-add upload flow (name + formatted size), reload persistence,
 * and the `...` menu (download / preview / delete). Download and preview open a
 * new tab (`/api/files/download/:id`, `/api/files/preview/:id`); we assert the
 * popup URL and close it rather than downloading the body.
 */
class File extends Base {
    private sidebar: Sidebar;

    constructor(page: Page) {
        super(page);
        this.sidebar = new Sidebar(page);
    }

    public view(): Locator {
        return this.page.getByTestId("file-view");
    }

    public name(): Locator {
        return this.page.getByTestId("file-name");
    }

    public size(): Locator {
        return this.page.getByTestId("file-size");
    }

    public menuButton(): Locator {
        return this.page.getByTestId("file-menu-button");
    }

    public menu(): Locator {
        return this.page.getByTestId("file-menu");
    }

    public menuDownload(): Locator {
        return this.page.getByTestId("file-menu-download");
    }

    public menuPreview(): Locator {
        return this.page.getByTestId("file-menu-preview");
    }

    public menuDelete(): Locator {
        return this.page.getByTestId("file-menu-delete");
    }

    /** Drives the sidebar quick-add "File" flow and returns the created document id. */
    public async openFromQuickAdd(filePath: string): Promise<string> {
        return this.sidebar.addFileDocument(filePath);
    }

    /** Waits for the file view to finish loading (upload complete + navigation). */
    public async waitForLoaded() {
        await expect(this.view()).toBeVisible({ timeout: 30000 });
    }

    /** Asserts the loaded file view shows the given original name and formatted size. */
    public async expectFile(name: string, size: string) {
        await expect(this.view()).toBeVisible();
        await expect(this.name()).toHaveText(name);
        await expect(this.size()).toHaveText(size);
    }

    /** Opens the `...` file menu. */
    public async openMenu() {
        await this.menuButton().click();
        await this.menu().waitFor({ state: "visible" });
    }

    /**
     * Clicks a menu item that opens in a new tab (`openInNewTab`) and returns the URL it
     * targets. Download and preview both open a tab; a forced download also emits a
     * `download` event. We race the two events, assert the URL, and cancel/close so nothing
     * is written to disk. This proves the menu wiring without scraping a response body.
     */
    private async captureUrl(menuItem: Locator, pathFragment: string): Promise<string> {
        const context = this.page.context();
        const downloadPromise = context.waitForEvent("download", { timeout: 15000 }).then(download => {
            void download.cancel();
            return download.url();
        });
        const pagePromise = context.waitForEvent("page", { timeout: 15000 }).then(async popup => {
            await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
            const url = popup.url();
            await popup.close().catch(() => undefined);
            return url;
        });

        await this.openMenu();
        await menuItem.click();

        const url = await Promise.race([downloadPromise, pagePromise]);
        if (!url.includes(pathFragment)) {
            throw new Error(`Expected a URL containing "${pathFragment}", got "${url}"`);
        }
        return url;
    }

    /** Clicks "Download..." and returns the download URL (proves the wiring). */
    public async downloadUrl(): Promise<string> {
        return this.captureUrl(this.menuDownload(), "/api/files/download/");
    }

    /** Clicks "Preview..." and returns the preview URL (proves the wiring). */
    public async previewUrl(): Promise<string> {
        return this.captureUrl(this.menuPreview(), "/api/files/preview/");
    }

    /** Clicks "Delete" in the file menu, surfacing the confirmation dialog. */
    public async requestDelete() {
        await this.openMenu();
        await this.menuDelete().click();
    }

    /** Confirms the pending delete dialog. */
    public async confirmDelete() {
        const dialog = this.page.getByRole("alertdialog");
        await dialog.waitFor({ state: "visible" });
        await dialog.getByTestId("confirm-dialog-confirm-button").click();
        await dialog.waitFor({ state: "hidden" });
    }

    /** Asserts the "requested file was not found" warning toast. */
    public async expectMissingFileToast() {
        await expect(this.page.getByText("The requested file was not found")).toBeVisible();
    }

    /** Asserts the sidebar tree no longer lists the given document. */
    public async expectSidebarDocumentGone(name: string) {
        await expect(this.sidebar.documentsTreeItems.filter({ hasText: name })).toHaveCount(0);
    }
}

export default File;
