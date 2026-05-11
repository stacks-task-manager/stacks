import { Locator, Page } from "@playwright/test";

export class NewProjectDialog {
    public dialog: Locator;
    public titleInput: Locator;
    public descriptionInput: Locator;
    public cancelButton: Locator;
    public saveButton: Locator;

    constructor(page: Page) {
        this.dialog = page.locator('[aria-labelledby="new-project-dialog"]');
        this.titleInput = this.dialog.getByTestId("new-project-title-input");
        this.descriptionInput = this.dialog.getByTestId("new-project-description-input");
        this.cancelButton = this.dialog.getByTestId("new-project-cancel-button");
        this.saveButton = this.dialog.getByTestId("new-project-save-button");
    }
}
