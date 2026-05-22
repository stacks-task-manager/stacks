import { Locator, Page } from "@playwright/test";

export class NewNotepadDialog {
    public dialog: Locator;
    public titleInput: Locator;
    public cancelButton: Locator;
    public saveButton: Locator;

    constructor(page: Page) {
        this.dialog = page.locator('[aria-labelledby="new-notepad-dialog"]');
        this.titleInput = this.dialog.getByTestId("new-notepad-name-input");
        this.cancelButton = this.dialog.getByTestId("new-notepad-dialog-cancel-button");
        this.saveButton = this.dialog.getByTestId("new-notepad-dialog-save-button");
    }
}
