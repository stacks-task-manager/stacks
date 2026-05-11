import { Locator, Page } from "@playwright/test";

export class PeopleDialog {
    public dialog: Locator;
    public searchInput: Locator;
    public clearAllButton: Locator;
    public saveButton: Locator;
    public assigneesMenu: Locator;
    public assigneesMenuItems: Locator;
    public selectedAssignees: Locator;

    constructor(page: Page) {
        this.dialog = page.locator('[aria-labelledby="people-dialog"]');
        this.searchInput = this.dialog.getByTestId("people-dialog-search-input");
        this.clearAllButton = this.dialog.getByTestId("people-dialog-clear-all-button");
        this.saveButton = this.dialog.getByTestId("people-dialog-save-button");
        this.assigneesMenu = this.dialog.getByTestId("people-dialog-assignees-menu");
        this.assigneesMenuItems = this.assigneesMenu.getByRole("menuitem");
        this.selectedAssignees = this.dialog.getByTestId("people-dialog-selected-assignees");
    }

    public async toggleAssignees(assignees: string[]): Promise<void> {
        for await (const assignee of assignees) {
            await this.assigneesMenuItems.filter({ hasText: assignee }).first().click();
        }

        await this.saveButton.click();
        await this.dialog.waitFor({ state: "hidden" });
    }

    public async getSelectedAssignees(): Promise<string[]> {
        return await this.selectedAssignees
            .locator(".avatar")
            .evaluateAll(elements => elements.map(el => el.getAttribute("title") || ""));
    }

    public async clearSelectedAssignees(): Promise<void> {
        await this.clearAllButton.click();
        await this.saveButton.click();
        await this.dialog.waitFor({ state: "hidden" });
    }
}
