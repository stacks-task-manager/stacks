import { Locator, Page } from "@playwright/test";
import { QuickTimelog } from "./QuickTimelog";

export class TimelogDialog {
    public dialog: Locator;
    public cancelButton: Locator;
    public saveButton: Locator;
    public quickTimelog: QuickTimelog;

    constructor(page: Page) {
        this.dialog = page.locator('[aria-labelledby="timelog-dialog"]');
        this.cancelButton = this.dialog.getByTestId("timelog-dialog-cancel-button");
        this.saveButton = this.dialog.getByTestId("timelog-dialog-save-button");

        this.quickTimelog = new QuickTimelog(page);
    }
}
