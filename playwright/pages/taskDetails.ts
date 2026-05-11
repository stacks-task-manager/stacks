import { Locator, Page } from "@playwright/test";
import Base from "./base";
import { metaOrControl } from "../utils";
import { PeopleDialog } from "./components/PeopleDialog";
import { Subtasks } from "./components/Subtasks";
import { DatePicker } from "./components/DatePicker";

class TaskDetails extends Base {
    public page: Page;
    public peopleDialog: PeopleDialog;
    public subtasks: Subtasks;
    public datePicker: DatePicker;

    public drawer: Locator;
    public panel: Locator;
    public task: Locator;
    public title: Locator;
    public description: Locator;
    public editLayout: Locator;
    public header: Locator;
    public assignees: Locator;
    public priority: Locator;
    public priorityMenu: Locator;
    public headerNewSubtaskButton: Locator;
    public dueDate: Locator;
    public startDate: Locator;
    public closeButton: Locator;
    public body: Locator;

    constructor(page: Page) {
        super(page);

        this.page = page;
        this.peopleDialog = new PeopleDialog(page);
        this.subtasks = new Subtasks(page);
        this.datePicker = new DatePicker(page);

        this.drawer = page.getByTestId("task-details-drawer");
        this.panel = page.locator('[aria-labelledby="task-details-panel"]');
        this.task = page.getByTestId("task-details");
        this.title = this.task.getByTestId("task-details-title");
        this.description = this.task.getByTestId("task-details-description");
        this.header = this.task.getByTestId("task-details-header");
        this.editLayout = this.task.getByTestId("edit-task-details-layout");
        this.assignees = this.task.getByTestId("task-details-assignees");
        this.priority = this.task.getByTestId("task-details-priority");
        this.priorityMenu = page.getByTestId("priority-menu");
        this.headerNewSubtaskButton = this.header.getByTestId("task-details-header-new-subtask-button");
        this.dueDate = this.task.getByTestId("task-details-due-date");
        this.startDate = this.task.getByTestId("task-details-start-date");
        this.closeButton = this.task.getByTestId("task-details-close-button");
        this.body = this.task.getByTestId("task-details-body");
    }

    public async waitUntilOpen(): Promise<void> {
        await this.drawer.waitFor({ state: "visible" });
        await this.task.waitFor({ state: "visible" });
    }

    public async setTitle(title: string): Promise<void> {
        const textarea = this.title.locator("textarea");
        await textarea.fill(title);
        await textarea.blur();
    }

    public async getTitle(): Promise<string> {
        return await this.title.locator("textarea").inputValue();
    }

    public async setDescription(description: string): Promise<void> {
        const editor = this.description.getByTestId("tip-tap-editor");
        await editor.click();
        await this.page.keyboard.press(`${metaOrControl}+A`);
        await this.page.keyboard.press("Backspace");
        await this.page.keyboard.type(description);
        // clicking outside of the editor
        await this.header.click();
    }

    public async getDescription(): Promise<string | null> {
        return await this.description.getByTestId("tip-tap-editor").textContent();
    }

    public async toggleAssignees(assignees: string[]): Promise<void> {
        await this.assignees.click();
        await this.peopleDialog.dialog.waitFor({ state: "visible" });
        await this.peopleDialog.toggleAssignees(assignees);
    }

    public async getSelectedAssignees(): Promise<string[]> {
        return await this.assignees
            .locator(".avatar")
            .evaluateAll(elements => elements.map(el => el.getAttribute("title") || ""));
    }

    public async clearSelectedAssignees(): Promise<void> {
        await this.assignees.click();
        await this.peopleDialog.dialog.waitFor({ state: "visible" });
        await this.peopleDialog.clearSelectedAssignees();
    }

    public async setPriority(priority: string): Promise<void> {
        await this.priority.click();
        await this.priorityMenu.waitFor({ state: "visible" });
        await this.priorityMenu.getByRole("menuitem", { name: priority }).click();
        await this.priorityMenu.waitFor({ state: "hidden" });
    }

    public async getPriority(): Promise<string | null> {
        return await this.priority.textContent();
    }

    public async clearPriority(): Promise<void> {
        await this.priority.getByRole("button", { name: "Remove tag" }).click();
    }

    public async setDueDate(date: Date) {
        await this.dueDate.click();
        await this.datePicker.wrapper.waitFor({ state: "visible" });
        await this.datePicker.setDate(date);
        await this.datePicker.wrapper.waitFor({ state: "hidden" });
    }

    public async clearDueDate() {
        await this.dueDate.getByRole("button", { name: "Remove tag" }).click();
    }

    public async setStartDate(date: Date) {
        await this.startDate.click();
        await this.datePicker.wrapper.waitFor({ state: "visible" });
        await this.datePicker.setDate(date);
        await this.datePicker.wrapper.waitFor({ state: "hidden" });
    }

    public async clearStartDate() {
        await this.startDate.getByRole("button", { name: "Remove tag" }).click();
    }

    public async close(): Promise<void> {
        await this.closeButton.click();
        await this.drawer.waitFor({ state: "hidden" });
    }
}

export default TaskDetails;
