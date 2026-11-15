// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * W3 — Task repeats editor (RepeatPicker).
 *
 * Covers the previously untested repeat controls in task details:
 *   - repeat-type-select       (daily / weekly / monthly / yearly / periodically)
 *   - repeat-month-day-select  (monthly day-of-month)
 *   - repeat-period-input      (periodically days after completion)
 *   - repeat-reopen-checkbox   (reopen task)
 *   - repeat-clear-button      (remove the repeat)
 *
 * Each configuration change is PATCHed to the task; the test reloads the page
 * after each change and asserts the persisted value plus the rendered chip label.
 *
 * Per the handoff, we do NOT assert that completing a task creates the next
 * occurrence — `repeats` is persisted as JSON only and no server loader acts on it.
 */
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import BoardView from "../../pages/boardView";
import TaskDetails from "../../pages/taskDetails";
import { getDb } from "../../fixtures/db";

const MAIN_COLUMN = "Column 1";
const PROJECT_NAME = `E2E Repeat Project ${randomUUID()}`;
const TASK_TITLE = `E2E Repeat Task ${randomUUID()}`;

test.describe("Project - Task repeats editor", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let board: BoardView;
    let taskDetails: TaskDetails;
    let projectId: string;
    let taskId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        board = new BoardView(page);
        taskDetails = new TaskDetails(page);

        projectId = await project.addNew({ name: PROJECT_NAME });
        await project.expectProjectUrl(projectId);

        await board.addColumn(MAIN_COLUMN);
        await project.addTask({
            project: PROJECT_NAME,
            column: MAIN_COLUMN,
            task: { title: TASK_TITLE },
        });
        taskId = await board.getCardIdByName(TASK_TITLE);
        await board.openCard(TASK_TITLE);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test("sets a repeat, persists it across reload, changes it, and clears it", async () => {
        // The task-details drawer is stateful and reopens after a page reload.
        // Wait for it to appear; only re-click the card if it did not.
        const reopenDetails = async () => {
            const details = page.getByTestId("task-details");
            try {
                await details.waitFor({ state: "visible", timeout: 5000 });
            } catch {
                await board.openCard(TASK_TITLE);
                await details.waitFor({ state: "visible" });
            }
        };

        // 1) Monthly on day 15, reopen ON.
        await taskDetails.openRepeatPicker();
        await taskDetails.selectRepeatType("monthly");
        await taskDetails.selectRepeatMonthDay("15");
        await taskDetails.setRepeatReopen(true);
        await taskDetails.closeRepeatPicker();

        await page.reload();
        await reopenDetails();
        await taskDetails.expectRepeatPersisted(taskId, { type: "monthly", value: "15", reopen: true });
        await taskDetails.expectRepeatLabel("Monthly");

        // 2) Switch to periodically, 10 days after completion.
        await taskDetails.openRepeatPicker();
        await taskDetails.selectRepeatType("periodically");
        await taskDetails.setRepeatPeriod(10);
        await taskDetails.closeRepeatPicker();

        await page.reload();
        await reopenDetails();
        await taskDetails.expectRepeatPersisted(taskId, { type: "periodically", value: "10" });
        await taskDetails.expectRepeatLabel("Periodically");

        // 3) Turn the reopen flag off.
        await taskDetails.openRepeatPicker();
        await taskDetails.setRepeatReopen(false);
        await taskDetails.closeRepeatPicker();

        await page.reload();
        await reopenDetails();
        await taskDetails.expectRepeatPersisted(taskId, { type: "periodically", value: "10", reopen: false });

        // 4) Clear the repeat entirely.
        await taskDetails.openRepeatPicker();
        await taskDetails.clearRepeat();
        await taskDetails.closeRepeatPicker();

        await page.reload();
        await reopenDetails();
        await taskDetails.expectRepeatCleared(taskId);
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

        if (projectId) await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        if (page && !page.isClosed() && projectId) await attempt(() => project.deleteById(projectId));

        if (page && !page.isClosed()) {
            await attempt(() => page.close());
        }
        if (context) {
            await attempt(() => context.close());
        }
        if (browser) {
            await attempt(() => browser.close());
        }

        if (errors.length > 0) {
            throw new Error(errors.map(error => String(error)).join("; "));
        }
    });
});
