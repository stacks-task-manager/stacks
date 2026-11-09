import { expect, Page } from "@playwright/test";
import type { IStack, ITask } from "@stacks/types";

export class TaskArchives {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public async loadTask(taskId: string, archived = false): Promise<ITask> {
        const response = await this.page.request.get(
            `/api/tasks?ids=${taskId}${archived ? "&archived=true" : ""}`
        );
        expect(response.ok(), `Task lookup returned ${response.status()}`).toBeTruthy();
        const body = await response.json();
        const tasks = body.data ?? body;
        const task = Array.isArray(tasks) ? tasks.find((item: { id?: string }) => item.id === taskId) : tasks;
        if (task?.id !== taskId) {
            throw new Error(`Task ${taskId} missing from /api/tasks?ids response: ${JSON.stringify(body)}`);
        }
        return task as ITask;
    }

    public async loadProjectStacks(projectId: string): Promise<IStack[]> {
        const response = await this.page.request.get(`/api/projects/${projectId}/stacks`);
        expect(response.ok(), `Project stack lookup returned ${response.status()}`).toBeTruthy();
        const body = await response.json();
        return body.data ?? body;
    }

    public async archiveFromTaskDetails(taskId: string, confirm: boolean): Promise<void> {
        const menuItem = this.page.getByTestId("task-details-menu-archive");
        if (!(await menuItem.isVisible())) {
            await this.page.getByTestId("task-details-menu-button").click();
            await expect(menuItem).toBeVisible();
        }
        await menuItem.click();

        const confirmButton = this.page.getByTestId("confirm-dialog-confirm-button");
        const cancelButton = this.page.getByTestId("confirm-dialog-cancel-button");
        await expect(confirmButton).toBeVisible();
        if (!confirm) {
            await cancelButton.click();
            await expect(confirmButton).toBeHidden();
            await expect(menuItem).toBeHidden();
            // The archive handler previously closed task details after a 500 ms timer, even on cancel.
            await this.page.waitForTimeout(650);
            await expect(this.page.getByTestId("task-details")).toBeVisible();
            return;
        }

        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" &&
                response.url().endsWith(`/api/tasks/${taskId}/archive`)
        );
        await confirmButton.click();
        const response = await responsePromise;
        expect(response.ok(), `Task archive returned ${response.status()}`).toBeTruthy();
        await expect(this.page.getByTestId("task-details")).toBeHidden();
    }

    public async openArchivedTasks(): Promise<void> {
        await this.page.getByTestId("project-menu-button").click();
        const archives = this.page.getByTestId("project-menu-archives");
        await expect(archives).toBeVisible();
        await archives.hover();
        const showArchived = this.page.getByTestId("project-menu-show-archived");
        await showArchived.waitFor({ state: "visible" });
        await showArchived.click();
        await expect(this.page.getByTestId("archived-tasks-dialog")).toBeVisible();
    }

    public async expectArchivedTaskVisible(taskId: string): Promise<void> {
        await expect(this.page.getByTestId(`table-archived-tasks-table-row-${taskId}`)).toBeVisible();
    }

    public async restoreArchivedTask(taskId: string): Promise<void> {
        const dialog = this.page.getByTestId("archived-tasks-dialog");
        await this.expectArchivedTaskVisible(taskId);
        await dialog.getByTestId(`table-archived-tasks-table-row-select-${taskId}-click-target`).click();
        const restore = this.page.getByTestId("archived-tasks-restore");
        await expect(restore).toBeEnabled();
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" &&
                response.url().endsWith(`/api/tasks/${taskId}/unarchive`)
        );
        await restore.click();
        const confirmButton = this.page.getByTestId("confirm-dialog-confirm-button");
        await expect(confirmButton).toBeVisible();
        await confirmButton.click();
        const response = await responsePromise;
        expect(response.ok(), `Task restore returned ${response.status()}`).toBeTruthy();
        await expect(this.page.getByTestId(`table-archived-tasks-table-row-${taskId}`)).toHaveCount(0);
    }

    public async closeArchivedTasks(): Promise<void> {
        await this.page.getByTestId("archived-tasks-close").click();
        await expect(this.page.getByTestId("archived-tasks-dialog")).toBeHidden();
    }

    public async deleteArchivedTask(taskId: string, confirm: boolean): Promise<void> {
        const dialog = this.page.getByTestId("archived-tasks-dialog");
        const selection = dialog.getByTestId(`table-archived-tasks-table-row-select-${taskId}-click-target`);
        await this.expectArchivedTaskVisible(taskId);
        await selection.click();
        await this.page.getByTestId("archived-tasks-delete").click();
        const confirmation = this.page.getByTestId("confirm-dialog-confirm-button");
        await expect(confirmation).toBeVisible();
        if (!confirm) {
            await this.page.getByTestId("confirm-dialog-cancel-button").click();
            await expect(confirmation).toBeHidden();
            await this.expectArchivedTaskVisible(taskId);
            await selection.click();
            return;
        }
        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "DELETE" &&
                new URL(response.url()).pathname === `/api/tasks/${taskId}`
        );
        await confirmation.click();
        const response = await responsePromise;
        expect(response.ok(), `Task delete returned ${response.status()}`).toBeTruthy();
        await expect(dialog.getByTestId(`table-archived-tasks-table-row-${taskId}`)).toHaveCount(0);
    }

    public async expectTaskMissing(taskId: string): Promise<void> {
        for (const suffix of ["", "&archived=true"]) {
            const response = await this.page.request.get(`/api/tasks?ids=${taskId}${suffix}`);
            expect(response.ok()).toBeTruthy();
            const body = await response.json();
            expect(body.data ?? body).toEqual([]);
        }
    }

    public async expectEmptyArchive(): Promise<void> {
        await expect(this.page.getByTestId("archived-tasks-empty")).toBeVisible();
    }

    public async moveTaskToProject(taskId: string, projectId: string, stackId: string): Promise<void> {
        await this.page.getByTestId("task-details-menu-button").click();
        const menuItem = this.page.getByTestId("task-details-menu-copy-move");
        await expect(menuItem).toBeVisible();
        await menuItem.click();

        const dialog = this.page.getByTestId("copymove-dialog");
        const moveAction = dialog.getByTestId("copymove-action-move");
        await expect(dialog).toBeVisible();
        await expect(moveAction).toBeEnabled();
        await moveAction.click();
        await dialog.getByTestId("copymove-project-select").selectOption(projectId);
        await dialog.getByTestId("copymove-stack-select").selectOption(stackId);

        const responsePromise = this.page.waitForResponse(
            response =>
                response.request().method() === "PATCH" && response.url().endsWith(`/api/tasks/${taskId}`)
        );
        const confirm = this.page.getByTestId("copymove-confirm-button");
        await expect(confirm).toBeEnabled();
        await confirm.click();
        const response = await responsePromise;
        expect(response.ok(), `Task move returned ${response.status()}`).toBeTruthy();
        await expect(dialog).toBeHidden();
    }
}
