import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";
import BoardView from "../../pages/boardView";
import Preferences from "../../pages/preferences";
import { hexToRgb, metaOrControl } from "../../utils";

const TEST_PROJECT = "Column project";
const MAIN_COLUMN = "Column 1";
const UNTITLED_STACK = "Untitled stack";

test.describe("Project - Board column", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let sidebar: Sidebar;
    let board: BoardView;
    let projectName: string;
    let preferences: Preferences;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);
        board = new BoardView(page);
        preferences = new Preferences(page);

        projectName = `${TEST_PROJECT} ${Math.floor(Math.random() * 10000)}`;

        const projectId = await project.addNew({ name: projectName });
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
        const count = await matchingProjects.count();
        expect(count).toBeGreaterThanOrEqual(1);
        await expect(page).toHaveURL(`/app/project/${projectId}?state=todo`);

        await board.addColumn(MAIN_COLUMN);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        await project.delete(projectName);
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
        await expect(matchingProjects).toHaveCount(0);
        await expect(page.getByRole("alert")).toHaveText("Record deleted successfully");

        if (page && !page.isClosed()) {
            await page.close();
        }

        if (context) {
            await context.close();
        }

        if (browser) {
            await browser.close();
        }
    });

    test("Should rename column", async () => {
        await expect(board.addNewColumnButton).toBeVisible();
        await board.addNewColumnButton.click();
        await expect(page.getByTestId("popup-new-generic-input")).toBeVisible();
        await page.getByTestId("popup-new-generic-input").fill("Column 2");
        await page.getByTestId("popup-new-generic-button").click();
        await expect(page.getByTestId("popup-new-generic-input")).toBeHidden();

        const NEW_COLUMN_NAME = "Column 2 Renamed";
        await board.renameColumn("Column 2", NEW_COLUMN_NAME);
        await expect(
            (await board.getColumnByName(NEW_COLUMN_NAME)).getByTestId("column-header-title")
        ).toHaveText(NEW_COLUMN_NAME);

        await board.deleteColumn(NEW_COLUMN_NAME);
    });

    test("Should show the following context menu options", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await column.getByTestId("column-header-wrapper").hover();
        await expect(column.getByTestId("column-header-menu-button")).toBeVisible();

        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();
        const labels = await board.columnContextMenuItems.allTextContents();
        await expect(labels).toEqual([
            "Add task",
            "Order tasksOpen sub menu",
            "Set tasks limitOpen sub menu",
            "Add Stack to the left",
            "Add Stack to the right",
            "Copy or Move",
            "Mark all as done",
            "Mark all as to do",
            "Archive all tasks...",
            "Archive completed tasks...",
            "Collapse stack",
            "TintOpen sub menu",
            "Delete stack",
        ]);

        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeHidden();
    });

    test("Should change the tint color from the header", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        await column.getByTestId("column-header-tint-button").click();
        await expect(page.getByTestId("tint-picker")).toBeVisible();

        const lastColor = "#8ac926";

        for await (const color of ["#ff006e", "#3a86ff", "#c81d25", lastColor]) {
            await page.locator(`[data-testid="color-button"][data-color="${color}"]`).click();
            await expect(column.getByTestId("column-header-tint-button")).toHaveCSS(
                "background-color",
                hexToRgb(color)
            );
        }

        // switch to see the stacks with a larger width
        await preferences.toggleSetting("Board", "Show larger Stack tint bar", true);
        await expect(column.getByTestId("column-header-tint-button")).toBeHidden();

        // expect to see the whole stacks header as colored
        await expect(column.getByTestId("column-header")).toHaveCSS("background-color", hexToRgb(lastColor));

        await preferences.toggleSetting("Board", "Show larger Stack tint bar", false);
        await expect(column.getByTestId("column-header-tint-button")).toBeVisible();
    });

    test("Should change the tint color from the context menu", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        await column.getByTestId("column-header-wrapper").hover();
        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();
        await board.columnContextMenuItems.getByText(/Tint/).hover();

        for await (const color of ["#ff006e", "#3a86ff", "#c81d25", "#8ac926"]) {
            await page.locator(`[data-testid="color-button"][data-color="${color}"]`).click();
            await expect(column.getByTestId("column-header-tint-button")).toHaveCSS(
                "background-color",
                hexToRgb(color)
            );
        }
    });

    test("Should collapse and uncollapse a column using the header button", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        // collapse column
        await expect(column).not.toHaveClass(/collapsed/);
        const collapseButton = column.getByTestId("column-header-collapse-button");
        await expect(collapseButton).toBeHidden(); // collapse button is hidden when uncollapsed and visible on hover

        await column.getByTestId("column-header-wrapper").hover();
        await expect(collapseButton).toBeVisible();

        await collapseButton.hover();
        await expect(board.tooltip.filter({ hasText: "Collapse stack" }).first()).toBeVisible();
        await collapseButton.click();

        await expect(column).toHaveClass(/collapsed/);

        // uncollapse column
        await expect(collapseButton).toBeVisible();
        await collapseButton.hover();
        await expect(board.tooltip.filter({ hasText: "Uncollapse stack" }).first()).toBeVisible();
        await collapseButton.click();
        await expect(column).not.toHaveClass(/collapsed/);
    });

    test("Should uncollapse a column using double click", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        // collapse column
        await expect(column).not.toHaveClass(/collapsed/);
        const collapseButton = column.getByTestId("column-header-collapse-button");
        await expect(collapseButton).toBeHidden(); // collapse button is hidden when uncollapsed and visible on hover
        await column.getByTestId("column-header-wrapper").hover();
        await expect(collapseButton).toBeVisible();
        await collapseButton.click();
        await expect(column).toHaveClass(/collapsed/);

        // uncollapse column
        await column.getByTestId("column-header-wrapper").dblclick();
        await expect(column).not.toHaveClass(/collapsed/);
    });

    test("Should collapse and uncollapse a column using the hotkeys", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        // select column
        await expect(column.locator(".stack-selected")).toBeHidden();
        await page.keyboard.press("ArrowRight");
        await expect(column.locator(".stack-selected")).toBeVisible();

        // collapse column
        await expect(column).not.toHaveClass(/collapsed/);
        await page.keyboard.press("Shift+ArrowLeft");
        await expect(column).toHaveClass(/collapsed/);

        // uncollapse column
        await expect(column).toHaveClass(/collapsed/);
        await page.keyboard.press("Shift+ArrowRight");
        await expect(column).not.toHaveClass(/collapsed/);
    });

    test("Should collapse and uncollapse a column using the context menu", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        // collapse column
        await expect(column).not.toHaveClass(/collapsed/);
        await column.getByTestId("column-header-wrapper").hover();
        const menuButton = column.getByTestId("column-header-menu-button");
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        await expect(board.columnContextMenu).toBeVisible();
        const collapseMenuItem = board.columnContextMenu.getByRole("menuitem", { name: "Collapse stack" });
        await expect(collapseMenuItem).toBeVisible();
        await collapseMenuItem.click();
        await expect(column).toHaveClass(/collapsed/);

        // uncollapse column
        await column.getByTestId("column-header-wrapper").hover();
        await expect(menuButton).toBeHidden();
        await column.getByTestId("column-header-collapse-button").click();
        await expect(column).not.toHaveClass(/collapsed/);
    });

    test("Should add a column to the left", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        await column.getByTestId("column-header-wrapper").hover();
        await expect(column.getByTestId("column-header-menu-button")).toBeVisible();

        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();

        await board.columnContextMenu.getByRole("menuitem", { name: "Add Stack to the left" }).click();
        await expect(board.columnContextMenu).toBeHidden();

        await expect(board.getColumnByName(UNTITLED_STACK)).toBeVisible();
        const columnTitles = await board.board.getByTestId("column-header-title").allTextContents();
        // Since we don't know exactly what other columns exist due to test order, we just check relative position
        const mainIndex = columnTitles.indexOf(MAIN_COLUMN);
        const untitledIndex = columnTitles.indexOf(UNTITLED_STACK);
        expect(untitledIndex).toBeLessThan(mainIndex);

        await board.deleteColumn(UNTITLED_STACK);
    });

    test("Should add a column to the right", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        await column.getByTestId("column-header-wrapper").hover();
        await expect(column.getByTestId("column-header-menu-button")).toBeVisible();

        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();

        await board.columnContextMenu.getByRole("menuitem", { name: "Add Stack to the right" }).click();
        await expect(board.columnContextMenu).toBeHidden();

        await expect(board.getColumnByName(UNTITLED_STACK)).toBeVisible();
        const columnTitles = await board.board.getByTestId("column-header-title").allTextContents();
        const mainIndex = columnTitles.indexOf(MAIN_COLUMN);
        const untitledIndex = columnTitles.indexOf(UNTITLED_STACK);
        expect(untitledIndex).toBeGreaterThan(mainIndex);

        await board.deleteColumn(UNTITLED_STACK);
    });

    test("Should add a task from the context, top and bottom", async () => {
        const COLUMN_NAME = "Column with tasks";
        await board.addColumn(COLUMN_NAME);

        const column = await board.getColumnByName(COLUMN_NAME);
        await expect(column).toBeVisible();

        async function addTask(taskTitle: string) {
            const input = page.getByTestId("new-task-title-input");
            await expect(input).toBeVisible();
            await input.fill(taskTitle);
            await page.keyboard.press("Enter");
        }

        // Context
        const TASK_CONTEXT = "Context";
        await column.getByTestId("column-header-wrapper").hover();
        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();
        await board.columnContextMenuItems.getByText("Add task").click();
        await expect(board.columnContextMenu).toBeHidden();
        await addTask(TASK_CONTEXT);
        await expect(column.getByTestId("task-card-title").getByText(TASK_CONTEXT)).toBeVisible();

        // Top
        const TASK_TOP = "Top";
        await column.getByTestId("column-header-add-button").click();
        await addTask(TASK_TOP);
        await expect(column.getByTestId("task-card-title").getByText(TASK_TOP)).toBeVisible();

        // Bottom
        const TASK_BOTTOM = "Bottom";
        await column.getByTestId("column-add-task-button").click();
        await addTask(TASK_BOTTOM);
        await expect(column.getByTestId("task-card-title").getByText(TASK_BOTTOM)).toBeVisible();

        const taskTitles = await column.getByTestId("task-card-title").allInnerTexts();
        await expect(taskTitles).toEqual([TASK_TOP, TASK_CONTEXT, TASK_BOTTOM]);

        await board.deleteColumn(COLUMN_NAME);
    });

    test.skip("Should order tasks via the column context menu", async () => {
        const COLUMN_NAME = "Column with tasks";
        await board.addColumn(COLUMN_NAME);

        const column = await board.getColumnByName(COLUMN_NAME);
        await expect(column).toBeVisible();

        const priorities = ["Low", "Medium", "High", "Critical"];
        const taskCount = 4;
        for (let i = 0; i < taskCount; i++) {
            await project.addTask({
                project: projectName,
                column: MAIN_COLUMN,
                task: {
                    title: `Task ${i + 1}`,
                    priority: priorities[i],
                },
            });
        }

        await expect(column.getByTestId("task-card")).toHaveCount(taskCount);

        await board.deleteColumn(COLUMN_NAME);

        // column ordering is broken
        await expect(1).toEqual(2);
    });

    test("Should set task limit", async () => {
        const TASK_LIMIT = 3;
        const COLUMN_NAME = "Limited column";
        await board.addColumn(COLUMN_NAME);

        const column = await board.getColumnByName(COLUMN_NAME);
        await column.getByTestId("column-header-wrapper").hover();
        await expect(column.getByTestId("column-header-menu-button")).toBeVisible();

        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();

        await board.columnContextMenuItems.getByText(/Set tasks limit/).hover();
        await expect(page.getByTestId("max-tasks-input")).toBeVisible();
        await page.getByTestId("max-tasks-input").fill(TASK_LIMIT.toString());
        await page.getByTestId("max-tasks-save-button").click();
        await expect(board.taskStackLimitIndicator).toBeHidden();

        for (let i = 0; i < TASK_LIMIT; i++) {
            await project.addTask({
                project: projectName,
                column: COLUMN_NAME,
                task: {
                    title: `Task ${i + 1}`,
                },
            });
        }

        await expect(board.taskStackLimitIndicator).toBeHidden();

        const overflowTaskName = `Task ${TASK_LIMIT + 1}`;
        await project.addTask({
            project: projectName,
            column: COLUMN_NAME,
            task: {
                title: overflowTaskName,
            },
        });

        await expect(board.taskStackLimitIndicator).toBeVisible();

        await board.deleteTaskCard(overflowTaskName);

        await expect(board.taskStackLimitIndicator).toBeHidden();

        await board.deleteColumn(COLUMN_NAME);
    });

    test("Should delete only the tasks", async () => {
        const COLUMN_NAME = "Delete tasks";
        await board.addColumn(COLUMN_NAME);

        const column = await board.getColumnByName(COLUMN_NAME);

        for await (const i of [1, 2, 3]) {
            await project.addTask({
                project: projectName,
                column: COLUMN_NAME,
                task: {
                    title: `Task ${i + 1}`,
                },
            });
        }

        await column.getByTestId("column-header-wrapper").hover();
        await expect(column.getByTestId("column-header-menu-button")).toBeVisible();

        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();

        await board.columnContextMenuItems.getByText("Delete stack").click();

        const confirmationDialog = page.getByRole("alertdialog");
        await expect(confirmationDialog).toBeVisible();

        await confirmationDialog.getByText("No, just delete all tasks").click();
        await expect(
            confirmationDialog.getByRole("checkbox", { name: "No, just delete all tasks" })
        ).toBeChecked();
        await confirmationDialog.getByRole("button", { name: "Yes" }).click();
        await expect(confirmationDialog).toBeHidden();

        await expect(column).toBeVisible();
        await expect(column.getByTestId("task-card")).toHaveCount(0);
        await board.deleteColumn(COLUMN_NAME);
    });

    test.skip("Should reorder tasks by drag and drop", async () => {
        await expect(1).toEqual(2);
    });

    test("Should move tasks to another column by drag and drop", async () => {
        const COLUMN_SOURCE = "Source Column";
        const COLUMN_TARGET = "Target Column";
        const TASK_NAME = "Move Me";

        await board.addColumn(COLUMN_SOURCE);
        await board.addColumn(COLUMN_TARGET);

        await project.addTask({
            project: projectName,
            column: COLUMN_SOURCE,
            task: { title: TASK_NAME },
        });

        const task = board.getCardByName(TASK_NAME);
        const column = board.getColumnByName(COLUMN_TARGET);

        await expect(task).toBeVisible();
        await expect(column).toBeVisible();

        await board.moveTaskToColumn(TASK_NAME, COLUMN_TARGET);

        const targetColumn = board.getColumnByName(COLUMN_TARGET);
        await expect(targetColumn.getByTestId("task-card-title")).toContainText(TASK_NAME);

        const sourceColumn = board.getColumnByName(COLUMN_SOURCE);
        await expect(sourceColumn.getByTestId("task-card")).toHaveCount(0);

        await board.deleteColumn(COLUMN_SOURCE);
        await board.deleteColumn(COLUMN_TARGET);
    });

    test("Should reorder columns by drag and drop", async () => {
        for await (const i of [2, 3]) {
            const columnName = `Column ${i}`;
            await board.addColumn(columnName);
        }

        await expect(board.columns.getByTestId("column-header-title")).toHaveText([
            "Column 1",
            "Column 2",
            "Column 3",
        ]);

        await board.moveColumn("Column 1", 200);
        const cols1 = await board.columns.getByTestId("column-header-title").allTextContents();
        expect(cols1).toEqual(["Column 2", "Column 1", "Column 3"]);

        await board.moveColumn("Column 1", 200);
        const cols2 = await board.columns.getByTestId("column-header-title").allTextContents();
        expect(cols2).toEqual(["Column 2", "Column 3", "Column 1"]);

        await board.moveColumn("Column 3", -200);
        const cols3 = await board.columns.getByTestId("column-header-title").allTextContents();
        expect(cols3).toEqual(["Column 3", "Column 2", "Column 1"]);

        await board.deleteColumn("Column 2");
        await board.deleteColumn("Column 3");

        const cols4 = await board.columns.getByTestId("column-header-title").allTextContents();
        expect(cols4).toEqual(["Column 1"]);
    });

    test.skip("Should change task counter", async () => {
        // columns - task - counter;
        await expect(1).toEqual(2);
    });

    test("Should delete a column (including tasks)", async () => {
        const column = await board.getColumnByName(MAIN_COLUMN);
        await expect(column).toBeVisible();

        await column.getByTestId("column-header-wrapper").hover();
        await expect(column.getByTestId("column-header-menu-button")).toBeVisible();

        await column.getByTestId("column-header-menu-button").click();
        await expect(board.columnContextMenu).toBeVisible();
        await board.columnContextMenu.getByRole("menuitem", { name: "Delete stack" }).click();
        await expect(board.columnContextMenu).toBeHidden();

        const confirmationDialog = page.getByRole("alertdialog");
        await expect(confirmationDialog).toBeVisible();

        await confirmationDialog.getByRole("button", { name: "Yes" }).click();
        await expect(confirmationDialog).toBeHidden();

        await expect(column).toBeHidden();
    });
});
