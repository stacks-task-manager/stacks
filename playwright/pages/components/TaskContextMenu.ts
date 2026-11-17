import { expect, Locator, Page } from "@playwright/test";
import Base from "../base";

/**
 * Owns the board/task card context menu (the dots button quick actions and the
 * full `taskcontext-*` menu) for a single card. The menu is a Blueprint
 * ContextMenu rendered in a portal, so every item is addressed by its stable
 * `data-testid` from the page root, never by text, role or CSS path.
 */
class TaskContextMenu extends Base {
    public quickDelete: Locator;
    public quickArchive: Locator;
    public quickAddSubtask: Locator;
    public quickComplete: Locator;
    public menuButton: Locator;

    constructor(
        page: Page,
        private card: Locator
    ) {
        super(page);
        this.quickDelete = card.getByTestId("task-context-button-delete");
        this.quickArchive = card.getByTestId("task-context-button-archive");
        this.quickAddSubtask = card.getByTestId("task-context-button-add-subtask");
        this.quickComplete = card.getByTestId("task-context-button-complete");
        this.menuButton = card.getByTestId("task-context-menu-button");
    }

    /** Reveals the card context controls and returns the (closed) menu surface. */
    public async reveal(): Promise<void> {
        const inner = this.card.getByTestId("task-card-inner-wrapper");
        // The card menu is tall and opens downward from the card; a fixed portal
        // can't be scrolled into view, so park the card near the top of the
        // viewport first to keep the last items (archive/delete) clickable.
        await inner.evaluate(el => (el as Element).scrollIntoView({ block: "start" }));
        await inner.hover();
        await this.card.getByTestId("task-context-button").waitFor({ state: "visible" });
        await this.card.getByTestId("task-context-button").hover();
        await this.menuButton.waitFor({ state: "visible" });
    }

    /** Opens the full dots menu. */
    public async open(): Promise<void> {
        await this.reveal();
        await this.menuButton.click();
        await this.item("taskcontext-archive").waitFor({ state: "visible" });
    }

    /** Closes any open menu without triggering an action. */
    public async close(): Promise<void> {
        await this.page.keyboard.press("Escape");
        await expect(this.item("taskcontext-archive")).toBeHidden();
    }

    public item(id: string): Locator {
        return this.page.getByTestId(id);
    }

    public expectItems(ids: string[]): void {
        for (const id of ids) {
            expect(this.item(id), `expected menu item ${id} to be present`).toBeVisible();
        }
    }

    public expectItemsAbsent(ids: string[]): void {
        for (const id of ids) {
            expect(this.item(id), `expected menu item ${id} to be absent`).toHaveCount(0);
        }
    }

    public async clickItem(id: string): Promise<void> {
        await this.item(id).click();
    }

    /**
     * Position-independent menu item click. The card menu is tall and, after its
     * entrance animation in a 720px viewport, its last items (archive/delete) can
     * sit outside the viewport — a Playwright actionability click can't reach them.
     * A DOM click still fires the Blueprint MenuItem handler and is not viewport-
     * bound, so the destructive hand-off stays reliable.
     */
    public async clickItemRobust(id: string): Promise<void> {
        await this.item(id).evaluate(el => (el as HTMLElement).click());
    }

    /**
     * Expands the Priority submenu (a Blueprint expandable item — hover reveals the
     * nested menu, a click on the parent does nothing) and selects a value
     * (none|low|medium|high|critical).
     */
    public async setPriority(priority: string): Promise<void> {
        await this.item("taskcontext-priority").hover();
        const option = this.page.getByTestId(`priority-${priority}`);
        await option.waitFor({ state: "visible" });
        await option.click();
    }

    /**
     * Expands the Progress submenu (Blueprint expandable item) and selects a value
     * (0..100 step 10).
     */
    public async setProgress(value: number): Promise<void> {
        await this.item("taskcontext-progress").hover();
        const option = this.page.getByTestId(`progress-menu-item-${value}`);
        await option.waitFor({ state: "visible" });
        await option.click();
    }

    /** Triggers the single-task archive action (raises the confirm alertdialog). */
    public async archive(): Promise<void> {
        await this.clickItemRobust("taskcontext-archive");
    }

    /** Triggers the single-task delete action (raises the confirm alertdialog). */
    public async delete(): Promise<void> {
        await this.clickItemRobust("taskcontext-delete");
    }

    public confirmDialog(): Locator {
        return this.page.getByRole("alertdialog");
    }

    public async confirmDialogButton(name: string): Promise<void> {
        const dialog = this.confirmDialog();
        await dialog.waitFor({ state: "visible" });
        await dialog.getByRole("button", { name }).click();
        await expect(dialog).toBeHidden();
    }

    /** Reads the server-side record for a task id and returns its raw JSON. */
    public async fetchTask(taskId: string): Promise<any> {
        const response = await this.page.request.get(`/api/tasks/${taskId}`);
        if (!response.ok()) {
            throw new Error(`GET /api/tasks/${taskId} returned ${response.status()}`);
        }
        const body = await response.json();
        return body.data ?? body;
    }

    /**
     * Waits until a task field on the server equals the expected value. The card
     * menu actions are async and fire-and-forget from the menu item's onClick,
     * so a single read right after the click can race the PATCH; polling removes
     * that race.
     */
    public async expectField(
        taskId: string,
        field: string,
        expected: unknown,
        timeout = 15000
    ): Promise<void> {
        await expect
            .poll(async () => (await this.fetchTask(taskId))[field], {
                timeout,
                message: `task ${taskId}.${field}`,
            })
            .toEqual(expected);
    }
}

export default TaskContextMenu;
