import { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class NewBookmarkDialog {
    public dialog: Locator;
    public titleInput: Locator;
    public urlInput: Locator;
    public cancelButton: Locator;
    public saveButton: Locator;
    public page: Page;

    constructor(page: Page) {
        this.page = page;
        this.dialog = page.locator('[aria-labelledby="new-bookmark-dialog"]');
        this.titleInput = this.dialog.getByTestId("new-bookmark-name-input");
        this.urlInput = this.dialog.getByTestId("new-bookmark-url-input");
        this.cancelButton = this.dialog.getByTestId("new-bookmark-dialog-cancel-button");
        this.saveButton = this.dialog.getByTestId("new-bookmark-dialog-save-button");
    }

    /** Types a title (and a URL for link bookmarks) into the dialog fields. */
    public async fill(title: string, url?: string) {
        await this.dialog.waitFor({ state: "visible" });
        await this.titleInput.fill(title);
        if (url !== undefined) await this.urlInput.fill(url);
    }

    /** Replaces a field value, so a saved bookmark carries the edited text rather than the draft. */
    public async edit(title: string, url?: string) {
        await this.titleInput.clear();
        await this.titleInput.fill(title);
        if (url !== undefined) {
            await this.urlInput.clear();
            await this.urlInput.fill(url);
        }
    }

    /** Saves the dialog and returns the created bookmark id from the real API response. */
    public async save(): Promise<string> {
        const created = this.page.waitForResponse(
            response =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/api/bookmarks"
        );
        await this.saveButton.click();
        const response = await created;
        expect(response.ok(), `bookmark create failed (${response.status()})`).toBeTruthy();
        await this.dialog.waitFor({ state: "hidden" });
        return (await response.json()).data.id as string;
    }

    /** Cancels the dialog without creating anything. */
    public async cancel() {
        await this.cancelButton.click();
        await this.dialog.waitFor({ state: "hidden" });
    }
}
