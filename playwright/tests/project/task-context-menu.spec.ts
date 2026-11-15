import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import BoardView from "../../pages/boardView";
import Preferences from "../../pages/preferences";
import { closeDb, getDb } from "../../fixtures/db";

const COLUMN = "Task context menu column";

test.describe("Project - Task context (card) menu", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let board: BoardView;
    let projectId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        board = new BoardView(page);

        // Scenario fixture: one project with a single board column. Created before
        // any task so cleanup can be registered against a captured id.
        projectId = await project.addNew({ name: `Task context menu ${Date.now()}` });
        await project.goto(`/app/project/${projectId}`);
        await project.switchView("board");
        await board.addColumn(COLUMN);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    // Per-scenario tasks are destroyed before the test that created them ends, and
    // their absence is proven (cleanupProjectTaskRecords re-counts and throws).
    test.afterEach(async () => {
        if (projectId) await getDb().cleanupProjectTaskRecords(projectId);
    });

    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        // Tasks (and their children) are not cascaded by document deletion, so
        // destroy them first; then remove the project document (stacks included).
        // Both helpers re-read and throw if the row survives.
        if (projectId) await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        if (projectId) await attempt(() => getDb().cleanupDocument(projectId));
        await attempt(closeDb);
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "Task context menu cleanup failed");
    });

    const addTask = async (title: string) => {
        await board.addTaskToColumn(COLUMN, title);
        return board.getCardIdByName(title);
    };

    test("single-task menu shows the documented item set", async () => {
        const title = `Single menu ${crypto.randomUUID()}`;
        await addTask(title);
        const menu = await board.openTaskContextMenu(title);

        menu.expectItems([
            "taskcontext-edit",
            "taskcontext-toggle-done",
            "taskcontext-tags",
            "taskcontext-status",
            "taskcontext-progress",
            "taskcontext-priority",
            "taskcontext-tint",
            "taskcontext-cover",
            "taskcontext-attach",
            "taskcontext-copymove",
            "taskcontext-quick-move",
            "taskcontext-privacy",
            "taskcontext-archive",
            "taskcontext-delete",
        ]);
        // The bulk-only items must not be present for a single selection.
        menu.expectItemsAbsent(["taskcontext-mark-done", "taskcontext-mark-todo"]);

        await menu.close();
    });

    test("multi-selection menu switches to the bulk variant and marks all selected done", async () => {
        const first = `Bulk first ${crypto.randomUUID()}`;
        const second = `Bulk second ${crypto.randomUUID()}`;
        await addTask(first);
        await addTask(second);
        const firstId = await board.getCardIdByName(first);
        const secondId = await board.getCardIdByName(second);

        // The board's in-memory keyboard-navigation state (NavigationStore) leaks
        // across tests in a shared page, which shifts the selection sequence. A
        // reload starts the board from a known-clean state; the tasks survive
        // because they are persisted in the database.
        await page.reload();
        await board.getCardByName(first).waitFor({ state: "visible" });
        await board.getCardByName(second).waitFor({ state: "visible" });

        // Keyboard selection is only registered when the highlight preferences
        // are enabled (navigateNextTask gates the selection on highlightTask).
        const preferences = new Preferences(page);
        await preferences.setPref("highlightStack", true);
        await preferences.setPref("highlightTask", true);

        await page.getByTestId("toggle-sidebar-button").focus();
        await page.keyboard.press("ArrowRight"); // focus the first card
        await page.keyboard.press("ArrowDown"); // move to the second card
        await page.keyboard.press("Shift+ArrowUp"); // range-select back to the first
        await expect(board.getCardByName(first).getByTestId("task-card-click-target")).toHaveAttribute(
            "data-selected",
            "true"
        );
        await expect(board.getCardByName(second).getByTestId("task-card-click-target")).toHaveAttribute(
            "data-selected",
            "true"
        );

        const menu = await board.openTaskContextMenu(first);
        menu.expectItems([
            "taskcontext-mark-done",
            "taskcontext-mark-todo",
            "taskcontext-tags",
            "taskcontext-status",
            "taskcontext-progress",
            "taskcontext-priority",
            "taskcontext-tint",
            "taskcontext-archive",
            "taskcontext-delete",
        ]);
        // The single-only items must not be present for a multi-selection.
        menu.expectItemsAbsent([
            "taskcontext-edit",
            "taskcontext-toggle-done",
            "taskcontext-cover",
            "taskcontext-attach",
            "taskcontext-privacy",
        ]);

        await menu.clickItem("taskcontext-mark-done");
        await menu.expectField(firstId, "done", true);
        await menu.expectField(secondId, "done", true);

        await page.keyboard.press("Escape");
    });

    test("toggle done persists after a reload", async () => {
        const title = `Toggle done ${crypto.randomUUID()}`;
        const taskId = await addTask(title);
        const menu = await board.openTaskContextMenu(title);

        await menu.clickItem("taskcontext-toggle-done");
        await menu.expectField(taskId, "done", true);

        await page.reload();
        await board.gotoProject(projectId);
        await menu.expectField(taskId, "done", true);
    });

    test("priority set from the card menu persists after a reload", async () => {
        const title = `Priority ${crypto.randomUUID()}`;
        const taskId = await addTask(title);
        const menu = await board.openTaskContextMenu(title);

        await menu.setPriority("high");
        await menu.expectField(taskId, "priority", "high");

        await page.reload();
        await board.gotoProject(projectId);
        await menu.expectField(taskId, "priority", "high");
    });

    test("progress set from the card menu persists after a reload", async () => {
        const title = `Progress ${crypto.randomUUID()}`;
        const taskId = await addTask(title);
        const menu = await board.openTaskContextMenu(title);

        await menu.setProgress(50);
        await menu.expectField(taskId, "progress", 50);

        await page.reload();
        await board.gotoProject(projectId);
        await menu.expectField(taskId, "progress", 50);
    });

    test("delete removes the card and the record is gone after a reload", async () => {
        const title = `Delete me ${crypto.randomUUID()}`;
        const taskId = await addTask(title);
        const menu = await board.openTaskContextMenu(title);

        await menu.delete();
        await menu.confirmDialogButton("Yes");
        await expect(board.getCardByName(title)).toHaveCount(0);

        await page.reload();
        await board.gotoProject(projectId);
        await expect(board.getCardByName(title)).toHaveCount(0);
        const response = await page.request.get(`/api/tasks/${taskId}`);
        expect(response.status()).toBe(404);
    });
});
