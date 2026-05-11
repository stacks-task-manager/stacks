import { expect, Locator, Page } from "@playwright/test";
import Base from "./base";

class BoardView extends Base {
    public board: Locator;
    public blankSlate: Locator;
    public blankSlateAddButton: Locator;
    public addNewColumnButton: Locator;
    public columns: Locator;
    public columnContextMenu: Locator;
    public columnContextMenuItems: Locator;
    public taskStackLimitIndicator: Locator;
    public cards: Locator;

    constructor(page: Page) {
        super(page);

        this.board = page.getByTestId("board-view");
        this.blankSlate = this.board.getByTestId("board-no-columns-blank-slate");
        this.blankSlateAddButton = this.board.getByTestId("board-no-columns-blank-slate-add-button");
        this.addNewColumnButton = this.board.getByTestId("stack-add-new");
        this.columns = this.board.getByTestId("board-column");
        this.columnContextMenu = page.getByTestId("column-menu");
        this.columnContextMenuItems = this.columnContextMenu.getByRole("menuitem");
        this.taskStackLimitIndicator = this.board.getByTestId("task-stack-limit-indicator");
        this.cards = this.board.getByTestId("task-card");
    }

    public getColumnByIndex(columnIndex: number): Locator {
        return this.columns.nth(columnIndex);
    }

    public getColumnByName(columnName: string): Locator {
        return this.columns.filter({
            has: this.page.getByTestId("column-header-title").filter({ hasText: columnName }),
        });
    }

    public async addColumn(columnName: string): Promise<void> {
        await this.blankSlateAddButton.or(this.addNewColumnButton).click();
        await this.page.getByTestId("popup-new-generic-input").fill(columnName);
        await this.page.getByTestId("popup-new-generic-button").click();
    }

    public async renameColumn(oldColumnName: string, newColumnName: string): Promise<void> {
        const column = await this.getColumnByName(oldColumnName);
        await column.getByTestId("column-header-wrapper").dblclick();
        const input = this.board.getByTestId("column-header-title-input");
        await expect(input).toBeVisible();
        await input.fill(newColumnName);
        await input.press("Enter");
        await expect(input).toBeHidden();
    }

    public async deleteColumn(columnName: string): Promise<void> {
        const column = await this.getColumnByName(columnName);
        await column.getByTestId("column-header-wrapper").hover();
        const menuButton = column.getByTestId("column-header-menu-button");
        await expect(menuButton).toBeVisible();
        await menuButton.click();

        const deleteMenuItem = this.columnContextMenuItems.filter({ hasText: "Delete stack" });
        await expect(deleteMenuItem).toBeVisible();
        await deleteMenuItem.click();
        const dialog = this.page.getByRole("alertdialog");
        await dialog.getByRole("button", { name: "Yes" }).click();
        await dialog.waitFor({ state: "hidden" });
    }

    public getCardByName(cardName: string): Locator {
        return this.cards.filter({
            has: this.page.getByTestId("task-card-title").filter({ hasText: cardName }),
        });
    }

    public async openCard(cardName: string): Promise<void> {
        const card = await this.getCardByName(cardName);
        await card.getByTestId("task-card-inner-wrapper").click();
    }

    public async deleteTaskCard(taskName: string): Promise<void> {
        const task = this.getCardByName(taskName);

        // hover card to show context menu
        await task.getByTestId("task-card-inner-wrapper").hover();
        await task.getByTestId("task-context-button").waitFor({ state: "visible" });
        // hover context menu to show quick actions
        await task.getByTestId("task-context-button").hover();
        // when quick actions are visible, delete button should be visible
        await task.getByTestId("task-context-button-delete").waitFor({ state: "visible" });
        await task.getByTestId("task-context-button-delete").click();
        // confirm delete
        await this.page.getByRole("alertdialog").getByRole("button", { name: "Yes" }).click();
        await expect(this.page.getByRole("alertdialog")).toBeHidden();
    }

    public async addTaskToColumn(columnName: string, taskTitle: string): Promise<void> {
        const column = await this.getColumnByName(columnName);
        await column.getByTestId("column-add-task-button").click();
        await this.page.getByTestId("new-task-title-input").fill(taskTitle);
        await this.page.keyboard.press("Enter");
    }

    public async moveColumn(columnName: string, amount: number): Promise<void> {
        const column = await this.getColumnByName(columnName);

        const header = column.getByTestId("column-header-wrapper");
        const box = await header.boundingBox();
        if (box) {
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;

            await this.page.mouse.move(x, y);
            await this.page.mouse.down();
            await this.page.mouse.move(x + amount, y, { steps: 10 });
            await this.page.mouse.up();
        }
    }

    public async moveTaskInColumn(taskName: string, columnName: string, amount: number): Promise<void> {
        const task = this.board.getByTestId("task-card").filter({ hasText: taskName }).first();
        const column = await this.getColumnByName(columnName);

        const taskBox = await task.boundingBox();
        const columnBox = await column.boundingBox();
        if (taskBox && columnBox) {
            const x = columnBox.x + columnBox.width / 2;
            const y = columnBox.y + columnBox.height / 2;

            await this.page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
            await this.page.mouse.down();
            await this.page.mouse.move(x, y + amount, { steps: 10 });
            await this.page.mouse.up();
        }
    }

    public async moveTaskToColumn(taskName: string, columnName: string): Promise<void> {
        const task = this.board.getByTestId("task-card").filter({ hasText: taskName }).first();
        const column = this.getColumnByName(columnName);
        const targetColumn = column.getByTestId("column-tasks-wrapper");

        // Ensure elements are ready
        await task.scrollIntoViewIfNeeded();
        await targetColumn.scrollIntoViewIfNeeded();

        const taskBox = await task.boundingBox();
        const columnBox = await targetColumn.boundingBox();

        if (taskBox && columnBox) {
            // Target the top-left of the task card to ensure we grab the draggable wrapper
            // and avoid inner elements that might capture events or not be draggable handles
            const startX = taskBox.x + 5;
            const startY = taskBox.y + 5;

            // Target the top of the column (safe zone for empty columns)
            const endX = columnBox.x + columnBox.width / 2;
            const endY = columnBox.y + 50;

            // Move to start
            await this.page.mouse.move(startX, startY);

            // Wait to ensure hover
            await this.page.waitForTimeout(200);

            await this.page.mouse.down();

            // Wait to ensure click is registered and drag starts
            await this.page.waitForTimeout(500);

            // Trigger drag start
            await this.page.mouse.move(startX, startY + 10, { steps: 5 });
            await this.page.waitForTimeout(500);

            // Move to target
            await this.page.mouse.move(endX, endY, { steps: 50 });

            // Wait over target to ensure drop zone is recognized
            await this.page.waitForTimeout(1000);

            // Small shake at the target
            await this.page.mouse.move(endX + 5, endY + 5, { steps: 5 });
            await this.page.mouse.move(endX, endY, { steps: 5 });
            await this.page.waitForTimeout(500);

            await this.page.mouse.up();

            // Wait for animation/state update
            await this.page.waitForTimeout(1000);
        }
    }
}

export default BoardView;
