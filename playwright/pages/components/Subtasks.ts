import { expect, Locator, Page } from "@playwright/test";
import { DateRangePicker } from "./DatePicker";

export class Subtasks {
    public page: Page;
    public dateRangePicker: DateRangePicker;
    public wrapper: Locator;
    public input: Locator;
    public addButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dateRangePicker = new DateRangePicker(page);
        this.wrapper = page.getByTestId("subtasks-wrapper");
        this.input = this.wrapper.getByTestId("subtasks-input");
        this.addButton = this.wrapper.getByTestId("new-subtask-button");
    }

    public async saveSubtask(subtask: string) {
        await this.input.fill(subtask);
        await this.input.press("Enter");
        await this.expectSubtaskVisible(subtask);
    }

    public async addSubtask(subtask: string) {
        if (await this.input.isVisible()) {
            await this.saveSubtask(subtask);
            return;
        }

        await this.addButton.click();
        await this.input.waitFor({ state: "visible" });
        await this.saveSubtask(subtask);
    }

    public async getSubtasks() {
        return await this.wrapper.getByTestId("subtask-item").all();
    }

    public async countSubtasks(): Promise<number> {
        return await this.wrapper.getByTestId("subtask-item").count();
    }

    public async expectSubtaskHidden(title: string): Promise<void> {
        await expect(this.subtaskRowByTitle(title)).toBeHidden();
    }

    public async getSubtaskId(title: string): Promise<string> {
        return this.getSubtaskIdFromRow(this.subtaskRowByTitle(title));
    }

    public async expectSubtaskPersisted(projectId: string, parentId: string, title: string): Promise<void> {
        const response = await this.page.request.get(`/api/tasks?project=${projectId}`);
        expect(response.ok()).toBeTruthy();
        const responseBody = await response.json();
        const tasks = responseBody.data ?? responseBody;
        expect(tasks).toEqual(expect.arrayContaining([expect.objectContaining({ title, parent: parentId })]));
    }

    public async detachSubtask(title: string): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        const subtaskId = await this.getSubtaskIdFromRow(row);
        const menu = await this.openSubtaskMenu(row, subtaskId);
        const detachAction = menu.getByTestId(`subtask-menu-detach-${subtaskId}`);
        await expect(detachAction).toBeVisible();
        await detachAction.click({ force: true });
        const confirmButton = this.page.getByTestId("confirm-dialog-confirm-button");
        await expect(confirmButton).toBeVisible();
        const updateResponse = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${subtaskId}`)
        );
        await confirmButton.click();
        const response = await updateResponse;
        expect(response.ok()).toBeTruthy();
    }

    public async deleteSubtask(title: string): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        const subtaskId = await this.getSubtaskIdFromRow(row);
        const menu = await this.openSubtaskMenu(row, subtaskId);
        const deleteAction = menu.getByTestId(`subtask-menu-delete-${subtaskId}`);
        await expect(deleteAction).toBeVisible();
        await deleteAction.click({ force: true });
        const confirmButton = this.page.getByTestId("confirm-dialog-confirm-button");
        await expect(confirmButton).toBeVisible();
        const deleteResponse = this.page.waitForResponse(
            response =>
                response.request().method() === "DELETE" && response.url().includes(`/api/tasks/${subtaskId}`)
        );
        await confirmButton.click();
        const response = await deleteResponse;
        expect(response.ok()).toBeTruthy();
    }

    public async pressAddHotkey(): Promise<void> {
        await this.page.keyboard.press("Shift+S");
        await this.input.waitFor({ state: "visible" });
    }

    public async expectInputVisible(): Promise<void> {
        await expect(this.input).toBeVisible();
    }

    public async toggleCompletion(title: string): Promise<void> {
        await this.subtaskStateByTitle(title).click();
    }

    public async expectMenuActions(title: string): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        const subtaskId = await this.getSubtaskIdFromRow(row);
        const menu = await this.openSubtaskMenu(row, subtaskId);
        for (const action of ["open-task", "edit-inline", "add-here", "detach", "delete"]) {
            await expect(menu.getByTestId(`subtask-menu-${action}-${subtaskId}`)).toBeVisible();
        }
        await row.getByTestId("subtask-menu-button").click({ force: true });
        await expect(menu).toBeHidden();
    }

    public async editInlineFromMenu(title: string, updatedTitle: string): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        const subtaskId = await this.getSubtaskIdFromRow(row);
        const menu = await this.openSubtaskMenu(row, subtaskId);
        const editAction = menu.getByTestId(`subtask-menu-edit-inline-${subtaskId}`);
        await expect(editAction).toBeVisible();
        await editAction.click();
        const input = this.wrapper.getByTestId("subtask-title-input");
        await expect(input).toBeVisible();
        await input.fill(updatedTitle);
        const updateResponse = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${subtaskId}`)
        );
        await this.page.keyboard.press("Enter");
        expect((await updateResponse).ok()).toBeTruthy();
    }

    public async editInlineWithModifier(title: string, updatedTitle: string): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        const subtaskId = await this.getSubtaskIdFromRow(row);
        const modifier = process.platform === "darwin" ? "Meta" : "Control";
        await row.getByTestId("subtask-title").click({ modifiers: [modifier] });
        const input = this.wrapper.getByTestId("subtask-title-input");
        await input.fill(updatedTitle);
        const updateResponse = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${subtaskId}`)
        );
        await this.page.keyboard.press("Enter");
        expect((await updateResponse).ok()).toBeTruthy();
    }

    public async openSubtask(title: string): Promise<void> {
        await this.subtaskRowByTitle(title).getByTestId("subtask-title").click();
    }

    public async expectSubtaskVisible(title: string): Promise<void> {
        await expect(this.subtaskRowByTitle(title)).toBeVisible();
    }

    public async expectSubtaskCompletion(title: string, completed: boolean): Promise<void> {
        const state = this.subtaskStateByTitle(title);
        if (completed) {
            await expect(state).toHaveClass(/(^|\s)active(\s|$)/);
        } else {
            await expect(state).not.toHaveClass(/(^|\s)active(\s|$)/);
        }
    }

    public async expectCompletionProgress(percent: number): Promise<void> {
        await expect(this.wrapper.getByTestId("subtasks-progress-value")).toHaveText(`${percent}%`);
        await expect(this.wrapper.getByTestId("subtasks-progress-bar")).toHaveAttribute(
            "aria-valuenow",
            String(percent)
        );
    }

    public subtaskRowByTitle(title: string): Locator {
        return this.wrapper
            .getByTestId("subtask-item")
            .filter({ has: this.page.getByTestId("subtask-title").filter({ hasText: title }) });
    }

    public subtaskStateByTitle(title: string): Locator {
        return this.subtaskRowByTitle(title).getByTestId("subtask-state");
    }

    public async getSubtask(subtask: string) {
        return await this.wrapper.getByTestId("subtask-item").getByText(subtask);
    }

    public async setNextWeekDates(title: string): Promise<string> {
        const subtask = this.subtaskRowByTitle(title);
        await subtask.hover({ force: true });
        const dateButton = subtask.getByTestId("subtask-dates-picker-button");
        await dateButton.click({ force: true });
        await this.dateRangePicker.wrapper.waitFor({ state: "visible" });
        await this.dateRangePicker.wrapper.getByTestId("date-range-picker-range-next-week").click();
        const selectedRange = (
            await this.dateRangePicker.wrapper.getByTestId("date-range-picker-wrapper").innerText()
        ).trim();
        const subtaskId = await this.getSubtaskIdFromRow(subtask);
        const updateResponse = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${subtaskId}`)
        );
        await this.dateRangePicker.applyButton.click();
        const response = await updateResponse;
        expect(response.ok()).toBeTruthy();
        return selectedRange;
    }

    public async getDateRangeText(title: string): Promise<string> {
        const subtask = this.subtaskRowByTitle(title);
        await subtask.hover({ force: true });
        const dateButton = subtask.getByTestId("subtask-dates-picker-button");
        await dateButton.click({ force: true });
        await this.dateRangePicker.wrapper.waitFor({ state: "visible" });
        const text = (
            await this.dateRangePicker.wrapper.getByTestId("date-range-picker-wrapper").innerText()
        ).trim();
        await this.dateRangePicker.cancelButton.click();
        return text;
    }

    public async assignPerson(title: string, personId: string): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        await row.getByTestId("subtask-assignees").click();
        const personItem = this.page.getByTestId(`person-item-${personId}`);
        await personItem.waitFor({ state: "visible" });
        await personItem.click();
    }

    public async toggleCurrentUserAssignment(title: string): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        await row.hover();
        const assignees = row.getByTestId("subtask-assignees");
        await expect(assignees).toBeVisible();
        await assignees.click();
        await this.page.getByTestId("person-item-current-user").first().click();
        await this.page.keyboard.press("Escape");
        await expect(this.page.getByTestId("person-item-current-user").first()).toBeHidden();
    }

    public async expectCurrentUserAssignment(title: string, assigned: boolean): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        await row.hover();
        const assignees = row.getByTestId("subtask-assignees");
        await expect(assignees).toBeVisible();
        await assignees.click();
        await expect(this.page.getByTestId("person-item-current-user").first()).toHaveAttribute(
            "data-selected",
            String(assigned)
        );
        await this.page.keyboard.press("Escape");
        await expect(this.page.getByTestId("person-item-current-user").first()).toBeHidden();
    }

    public async expectPersonAssigned(title: string, personId: string, assigned: boolean): Promise<void> {
        const row = this.subtaskRowByTitle(title);
        await expect(row.getByTestId(`person-item-${personId}`)).toHaveAttribute(
            "data-selected",
            String(assigned)
        );
    }

    private async getSubtaskIdFromRow(row: Locator): Promise<string> {
        const id = await row.getAttribute("data-id");
        if (!id) throw new Error("Subtask row did not expose its entity ID");
        return id;
    }

    private async openSubtaskMenu(row: Locator, subtaskId: string): Promise<Locator> {
        await row.hover();
        const menuButton = row.getByTestId("subtask-menu-button");
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        const menu = this.page.getByTestId(`subtask-menu-${subtaskId}`);
        await expect(menu).toBeVisible();
        return menu;
    }
}
