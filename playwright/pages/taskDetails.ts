import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";
import { PeopleDialog } from "./components/PeopleDialog";
import { Subtasks } from "./components/Subtasks";
import { DatePicker } from "./components/DatePicker";

class TaskDetails extends Base {
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
    public fullscreenButton: Locator;
    public menuButton: Locator;
    public menu: Locator;
    public tabs: Locator;
    public timeEntriesTab: Locator;
    public previousTaskButton: Locator;
    public nextTaskButton: Locator;

    constructor(page: Page) {
        super(page);

        this.peopleDialog = new PeopleDialog(page);
        this.subtasks = new Subtasks(page);
        this.datePicker = new DatePicker(page);

        this.drawer = page.getByTestId("task-details");
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
        this.fullscreenButton = this.task.getByTestId("task-details-fullscreen-button");
        this.menuButton = this.task.getByTestId("task-details-menu-button");
        this.menu = page.getByTestId("task-details-menu");
        this.tabs = page.getByTestId("task-details-tabs");
        this.timeEntriesTab = this.tabs.getByTestId("task-details-tab-timelogs");
        this.previousTaskButton = this.header.getByTestId("task-details-previous-task");
        this.nextTaskButton = this.header.getByTestId("task-details-next-task");
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
        const editor = this.description.getByTestId("tip-tap-contenteditable");
        await editor.fill(description);
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

    public async reload(): Promise<void> {
        await this.page.reload();
        await this.waitUntilOpen();
    }

    public async reloadAndWaitForRecords(): Promise<void> {
        const recordsResponse = this.page.waitForResponse(
            response => response.request().method() === "GET" && response.url().includes("/api/documents")
        );
        await this.page.reload();
        const response = await recordsResponse;
        expect(response.ok(), `Records load returned ${response.status()}`).toBeTruthy();
        await this.waitUntilOpen();
    }

    public async reloadAndWaitForTaskData(): Promise<void> {
        const taskResponse = this.page.waitForResponse(
            response => response.request().method() === "GET" && response.url().includes("/api/tasks")
        );
        await this.page.reload();
        const response = await taskResponse;
        expect(response.ok(), `Task load returned ${response.status()}`).toBeTruthy();
        await this.waitUntilOpen();
    }

    public async openProjectTask(projectId: string, taskId: string): Promise<void> {
        await this.page.goto(`/app/project/${projectId}/${taskId}`);
        await this.waitUntilOpen();
        await this.expectTaskId(taskId);
    }

    public async openParentTask(title: string): Promise<void> {
        await this.page.getByTestId("task-details-parent-link").click();
        await expect.poll(() => this.getTitle()).toEqual(title);
    }

    public async expectTitle(title: string): Promise<void> {
        await expect.poll(() => this.getTitle()).toEqual(title);
    }

    public async navigateNext(currentTitle: string): Promise<string> {
        await this.nextTaskButton.click();
        await expect.poll(() => this.getTitle()).not.toEqual(currentTitle);
        return await this.getTitle();
    }

    public async navigatePrevious(title: string): Promise<void> {
        await this.previousTaskButton.click();
        await this.expectTitle(title);
    }

    public async openDependenciesDialog(): Promise<void> {
        const dependenciesTab = this.page.getByTestId("task-details-tab-dependencies");
        await dependenciesTab.click();
        if ((await dependenciesTab.getAttribute("aria-selected")) !== "true") {
            await dependenciesTab.focus();
            await dependenciesTab.press("Enter");
        }
        await expect(dependenciesTab).toHaveAttribute("aria-selected", "true");
        const addDependencies = this.page.getByTestId("task-details-add-dependencies");
        await expect(addDependencies).toBeVisible();
        await addDependencies.click();
        await this.page.getByTestId("task-dependencies-dialog").waitFor({ state: "visible" });
    }

    public async selectDependencyProject(projectId: string, projectTitle: string): Promise<void> {
        await this.page.getByTestId("task-dependencies-project-picker").click();
        await this.page.getByTestId(`task-dependency-project-option-${projectId}`).click({ timeout: 30000 });
        const dialog = this.page.getByTestId("task-dependencies-dialog");
        await expect(dialog).toBeVisible();
        await expect(this.page.getByTestId("task-dependencies-project-picker")).toContainText(projectTitle);
    }

    public async selectDependencyStack(stackId: string): Promise<void> {
        const stack = this.page.getByTestId(`task-dependency-stack-option-${stackId}`);
        await stack.click();
        await expect(this.page.getByTestId("task-dependencies-dialog")).toBeVisible();
        await expect(stack).toHaveAttribute("data-selected", "true");
    }

    public async closeDependenciesDialog(): Promise<void> {
        await this.page.getByTestId("task-dependencies-cancel").click();
        await this.page.getByTestId("task-dependencies-dialog").waitFor({ state: "hidden" });
    }

    public async setDependencySelection(
        projectTitle: string,
        stackId: string,
        dependencyTaskId: string,
        selected: boolean
    ): Promise<void> {
        await expect(this.page.getByTestId("task-dependencies-project-picker")).toContainText(projectTitle);
        const stack = this.page.getByTestId(`task-dependency-stack-option-${stackId}`);
        await expect(stack).toHaveAttribute("data-selected", "true");

        const task = this.page.getByTestId(`task-dependency-task-${dependencyTaskId}`);
        await task.waitFor({ state: "visible" });
        if ((await task.getAttribute("data-selected")) !== String(selected)) {
            await task.click();
        }
        await expect(task).toHaveAttribute("data-selected", String(selected));
    }

    public async saveDependencySelection(taskId: string, expectedDependencies: string[]): Promise<void> {
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
        );
        await this.page.getByTestId("task-dependencies-select").click();
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();
        await this.page.getByTestId("task-dependencies-dialog").waitFor({ state: "hidden" });
        await this.expectDependenciesPersisted(taskId, expectedDependencies);
    }

    public async expectDependenciesPersisted(taskId: string, expectedDependencies: string[]): Promise<void> {
        const persistedResponse = await this.page.request.get(`/api/tasks?ids=${taskId}`);
        expect(persistedResponse.ok()).toBeTruthy();
        const responseBody = await persistedResponse.json();
        const persistedTask = (responseBody.data ?? responseBody).find(
            (task: { id: string }) => task.id === taskId
        );
        expect(persistedTask?.dependencies).toEqual(expectedDependencies);
    }

    public async getTaskId(): Promise<string> {
        const id = await this.task.getAttribute("data-id");
        if (!id) throw new Error("Task details did not expose its entity ID");
        return id;
    }

    public async expectTaskId(taskId: string): Promise<void> {
        await expect(this.task).toHaveAttribute("data-id", taskId);
    }

    public async expectDependencySelection(taskId: string, selected: boolean): Promise<void> {
        await expect(this.page.getByTestId(`task-dependency-task-${taskId}`)).toHaveAttribute(
            "data-selected",
            String(selected)
        );
    }

    public async expectDependencyTaskVisible(taskId: string): Promise<void> {
        await expect(this.page.getByTestId(`task-dependency-task-${taskId}`)).toBeVisible();
    }

    public async expectDependencyTaskHidden(taskId: string): Promise<void> {
        await expect(this.page.getByTestId(`task-dependency-task-${taskId}`)).toHaveCount(0);
    }

    public async expectDependencyTaskDisabled(taskId: string): Promise<void> {
        await expect(this.page.getByTestId(`task-dependency-task-${taskId}`)).toBeDisabled();
    }

    public async expectDependencyEmptyState(): Promise<void> {
        const dependenciesTab = this.page.getByTestId("task-details-tab-dependencies");
        await dependenciesTab.click();
        await expect(dependenciesTab).toHaveAttribute("aria-selected", "true");
        await expect(this.page.getByTestId("task-details-add-dependencies")).toBeVisible();
    }

    public async setStatus(statusId: string): Promise<void> {
        const taskId = await this.getTaskId();
        await this.task.getByTestId("task-details-status-trigger-matrix").click();
        const option = this.page.getByTestId(`tag-picker-option-${statusId}`);
        await expect(option).toBeVisible();
        const update = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
        );
        await option.click();
        expect((await update).ok()).toBeTruthy();
    }

    public async clearStatus(): Promise<void> {
        const taskId = await this.getTaskId();
        const update = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
        );
        await this.task.getByTestId("task-details-status-trigger-matrix-clear").click();
        const response = await update;
        expect(response.ok(), `${response.status()}: ${await response.text()}`).toBeTruthy();
    }

    public async setTaskTag(tagId: string, selected: boolean): Promise<void> {
        const taskId = await this.getTaskId();
        await this.task.getByTestId("task-details-tags-trigger-matrix").click();
        const option = this.page.getByTestId(`tag-picker-option-${tagId}`);
        await expect(option).toBeVisible();
        if ((await option.getAttribute("data-selected")) !== String(selected)) {
            await option.click();
            const update = this.page.waitForResponse(
                response =>
                    response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
            );
            await this.page.keyboard.press("Escape");
            expect((await update).ok()).toBeTruthy();
        } else {
            await this.page.keyboard.press("Escape");
        }
    }

    public async expectStatusPersisted(taskId: string, statusId: string | null): Promise<void> {
        const task = await this.getPersistedTask(taskId);
        expect(task.status).toBe(statusId);
        if (statusId) {
            await this.task.getByTestId("task-details-status-trigger-matrix").click();
            await expect(this.page.getByTestId(`tag-picker-option-${statusId}`)).toHaveAttribute(
                "data-selected",
                "true"
            );
            await this.page.keyboard.press("Escape");
        } else {
            await expect(this.task.getByTestId("task-details-status-trigger-matrix")).toBeVisible();
        }
    }

    public async expectTaskTagsPersisted(taskId: string, tagIds: string[]): Promise<void> {
        const task = await this.getPersistedTask(taskId);
        expect(task.tags).toEqual(tagIds);
        if (tagIds.length) {
            await this.task.getByTestId("task-details-tags-trigger-matrix").click();
            for (const tagId of tagIds) {
                await expect(this.page.getByTestId(`tag-picker-option-${tagId}`)).toHaveAttribute(
                    "data-selected",
                    "true"
                );
            }
            await this.page.keyboard.press("Escape");
        }
    }

    public async setEstimate(value: string): Promise<void> {
        await this.task.getByTestId("task-estimate-trigger").click();
        const input = this.page.getByTestId("task-estimate-input");
        await expect(input).toBeVisible();
        const taskId = await this.getTaskId();
        const update = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
        );
        await input.fill(value);
        await input.press("Enter");
        const response = await update;
        expect(response.ok()).toBeTruthy();
        await expect(this.task.getByTestId("task-estimate-trigger")).toContainText(value);
    }

    public async enterInvalidEstimate(value: string): Promise<void> {
        await this.task.getByTestId("task-estimate-trigger").click();
        const input = this.page.getByTestId("task-estimate-input");
        await expect(input).toBeVisible();
        await input.fill(value);
        await expect(input).toHaveAttribute("data-valid", "false");
        await input.press("Enter");
        await input.blur();
        await expect(input).toHaveValue(value);
    }

    public async clearEstimate(): Promise<void> {
        const trigger = this.task.getByTestId("task-estimate-trigger");
        const taskId = await this.getTaskId();
        const update = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
        );
        await trigger.getByRole("button").click();
        const response = await update;
        expect(response.ok()).toBeTruthy();
        await expect(trigger).toBeVisible();
    }

    public async expectEstimate(value?: string): Promise<void> {
        const trigger = this.task.getByTestId("task-estimate-trigger");
        if (value) {
            await expect(trigger).toContainText(value);
        } else {
            await expect(trigger).toBeVisible();
        }
    }

    public async expectEstimatePersisted(taskId: string, estimate: number | null): Promise<void> {
        const task = await this.getPersistedTask(taskId);
        expect(task.estimate).toBe(estimate);
    }

    public async selectProgress(progress: number): Promise<void> {
        const taskId = await this.getTaskId();
        await this.task.getByTestId("task-details-progress-trigger").click();
        const menu = this.page.getByTestId("progress-menu");
        await expect(menu).toBeVisible();
        const update = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
        );
        await menu.getByTestId(`progress-menu-item-${progress}`).click();
        const response = await update;
        expect(response.ok()).toBeTruthy();
    }

    public async expectProgressPersisted(taskId: string, progress: number): Promise<void> {
        const task = await this.getPersistedTask(taskId);
        expect(task.progress).toBe(progress);
        await this.task.getByTestId("task-details-progress-trigger").click();
        const menuItem = this.page.getByTestId(`progress-menu-item-${progress}`);
        await expect(menuItem).toHaveAttribute("data-selected", "true");
        await this.page.keyboard.press("Escape");
        await expect(this.page.getByTestId("progress-menu")).toBeHidden();
    }

    private async getPersistedTask(taskId: string): Promise<any> {
        const response = await this.page.request.get(`/api/tasks?ids=${taskId}`);
        expect(response.ok()).toBeTruthy();
        const responseBody = await response.json();
        const tasks = responseBody.data ?? responseBody;
        const task = tasks.find((item: { id: string }) => item.id === taskId);
        expect(task).toBeDefined();
        return task;
    }

    public async captureDependencyPickerStorage(taskId: string): Promise<Record<string, string>> {
        return this.page.evaluate(id => {
            const suffixes = [`${id}_task-dependencies-project`, `${id}_task-dependencies-stack`];
            return Object.fromEntries(
                Object.keys(localStorage)
                    .filter(key => suffixes.some(suffix => key.endsWith(suffix)))
                    .map(key => [key, localStorage.getItem(key)!])
            );
        }, taskId);
    }

    public async restoreDependencyPickerStorage(
        taskId: string,
        previousValues: Record<string, string>
    ): Promise<void> {
        await this.page.evaluate(
            ({ id, values }) => {
                const suffixes = [`${id}_task-dependencies-project`, `${id}_task-dependencies-stack`];
                for (const key of Object.keys(localStorage)) {
                    if (suffixes.some(suffix => key.endsWith(suffix))) localStorage.removeItem(key);
                }
                for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
            },
            { id: taskId, values: previousValues }
        );
    }

    public async openNewSubtaskInput(): Promise<void> {
        await this.headerNewSubtaskButton.click();
        await this.subtasks.expectInputVisible();
    }

    public async toggleFullscreen(): Promise<void> {
        await this.fullscreenButton.click();
    }

    public async openMenu(): Promise<void> {
        await this.menuButton.click();
        await this.page.getByTestId("task-details-menu-toggle-complete").waitFor({ state: "visible" });
    }

    public async closeMenu(): Promise<void> {
        await this.page.keyboard.press("Escape");
        await this.menu.waitFor({ state: "hidden" });
    }

    public async toggleDoneFromMenu(): Promise<void> {
        const taskId = await this.getTaskId();
        await this.openMenu();
        const update = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().includes(`/api/tasks/${taskId}`)
        );
        await this.page.getByTestId("task-details-menu-toggle-complete").click();
        const response = await update;
        expect(response.ok(), `${response.status()}: ${await response.text()}`).toBeTruthy();
        await expect.poll(async () => (await this.getPersistedTask(taskId)).done).not.toBeUndefined();
    }

    public async expectPersistedDone(taskId: string, done: boolean): Promise<void> {
        await expect.poll(async () => (await this.getPersistedTask(taskId)).done).toBe(done);
    }

    public async getPersistedDone(taskId: string): Promise<boolean> {
        return Boolean((await this.getPersistedTask(taskId)).done);
    }

    public menuItem(testId: string): Locator {
        return this.page.getByTestId(testId);
    }

    public tab(tabName: string): Locator {
        return this.tabs.getByRole("tab", { name: tabName });
    }

    public async openTimeEntries(): Promise<void> {
        await this.timeEntriesTab.click();
        await expect(this.timeEntriesTab).toHaveAttribute("aria-selected", "true");
    }
}

export default TaskDetails;
