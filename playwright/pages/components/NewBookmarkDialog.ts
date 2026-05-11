import { Locator, Page } from "@playwright/test";

export class NewBookmarkDialog {
    public dialog: Locator;
    public titleInput: Locator;
    public urlInput: Locator;
    public cancelButton: Locator;
    public saveButton: Locator;

    constructor(page: Page) {
        this.dialog = page.locator('[aria-labelledby="new-bookmark-dialog"]');
        this.titleInput = this.dialog.getByTestId("new-bookmark-name-input");
        this.urlInput = this.dialog.getByTestId("new-bookmark-url-input");
        this.cancelButton = this.dialog.getByTestId("new-bookmark-dialog-cancel-button");
        this.saveButton = this.dialog.getByTestId("new-notepad-dialog-save-button");
    }
}
