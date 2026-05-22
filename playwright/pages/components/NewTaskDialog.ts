import { Locator, Page } from "@playwright/test";

export class NewTaskDialog {
    public dialog: Locator;
    public titleInput: Locator;
    public descriptionInput: Locator;
    public projectSelectButton: Locator;
    public projectSelectMenu: Locator;
    public stackSelectButton: Locator;
    public stackSelectMenu: Locator;
    public priorityButton: Locator;
    public priorityMenu: Locator;

    public minimizeButton: Locator;
    public closeButton: Locator;
    public cancelButton: Locator;
    public saveButton: Locator;

    constructor(page: Page) {
        this.dialog = page.locator('[aria-labelledby="new-task-dialog"]');
        this.titleInput = this.dialog.getByTestId("new-task-title-input");
        this.descriptionInput = this.dialog.getByTestId("new-task-description-input");
        this.projectSelectButton = this.dialog.getByTestId("project-select-button");
        this.projectSelectMenu = page.getByTestId("project-select-menu");
        this.stackSelectButton = this.dialog.getByTestId("stack-select-button");
        this.stackSelectMenu = page.getByTestId("stack-select-menu");

        this.minimizeButton = this.dialog.getByTestId("new-task-dialog-minimize-button");
        this.closeButton = this.dialog.getByTestId("new-task-dialog-close-button");
        this.cancelButton = this.dialog.getByTestId("new-task-dialog-cancel-button");
        this.priorityButton = this.dialog.getByTestId("priority-button");
        this.priorityMenu = page.getByTestId("priority-menu");
        this.saveButton = this.dialog.getByTestId("new-task-dialog-save-button");
    }
}
