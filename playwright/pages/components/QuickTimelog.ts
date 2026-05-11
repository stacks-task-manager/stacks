import { Locator, Page } from "@playwright/test";

export class QuickTimelog {
    public timelog: Locator;
    public cancelButton: Locator;
    public saveButton: Locator;
    public saveAnotherMenu: Locator;
    public saveAnotherButton: Locator;

    constructor(page: Page) {
        this.timelog = page.getByTestId("quick-timelog");
        this.cancelButton = this.timelog.getByTestId("quick-timelog-cancel-button");
        this.saveButton = this.timelog.getByTestId("quick-timelog-save-button");
        this.saveAnotherMenu = this.timelog.getByTestId("quick-timelog-save-another-menu");
        this.saveAnotherButton = this.timelog.getByTestId("quick-timelog-save-another-button");
    }
}
