import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import users from "../../config/users";
import Project from "../../pages/project";

import TasksTable from "../../pages/tasksTable";

/**
 * Pins the column-visibility contract of the `TasksTable` POM: scenarios may override
 * the persisted preference, but `restoreColumnVisibility()` must put back exactly what
 * was there before — including its absence — and must be a no-op when nothing was
 * overridden.
 *
 * The scenario owns its fixture (its own project, stack and assigned task), so it does
 * not depend on whoever is signed in already having an assigned task.
 *
 * Reproduce: `yarn playwright test tests/views/tasks-table-columns.spec.ts --project=chrome --retries=0`
 */
const TEST_PROJECT = `Tasks table columns project ${Date.now()}`;
const MAIN_COLUMN = `Column 1`;
const TASK_TITLE = `Column visibility carrier task ${Date.now()}`;

test.describe("Tasks table - column visibility preference contract", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let tasksTable: TasksTable;
    let projectId: string;
    let personId: string;
    let taskId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        tasksTable = new TasksTable(page);

        projectId = await project.addNew({ name: TEST_PROJECT });
        await tasksTable.createStackViaApi({ projectId, title: MAIN_COLUMN });
        await project.addTask({
            project: TEST_PROJECT,
            column: MAIN_COLUMN,
            task: { title: TASK_TITLE },
        });
        personId = await tasksTable.getPersonIdByEmail(users.admin.username);
        taskId = await tasksTable.waitForTaskViaApi({ projectId, title: TASK_TITLE });
        await tasksTable.assignTaskViaApi({ projectId, title: TASK_TITLE, personId });
    });

    test.afterAll(async () => {
        // every resource is cleaned up independently: one failure must not skip the rest
        const cleanupErrors: string[] = [];

        try {
            if (page && !page.isClosed() && taskId) await tasksTable.deleteTaskViaApi(taskId);
        } catch (error) {
            cleanupErrors.push(`task cleanup failed: ${error}`);
        }
        try {
            if (page && !page.isClosed() && projectId) await project.deleteById(projectId);
        } catch (error) {
            cleanupErrors.push(`project cleanup failed: ${error}`);
        }
        try {
            await tasksTable.seedColumnVisibility(null);
        } catch (error) {
            cleanupErrors.push(`preference cleanup failed: ${error}`);
        }

        try {
            if (page && !page.isClosed()) await page.close();
        } catch (error) {
            cleanupErrors.push(`page close failed: ${error}`);
        }
        try {
            if (context) await context.close();
        } catch (error) {
            cleanupErrors.push(`context close failed: ${error}`);
        }
        try {
            if (browser) await browser.close();
        } catch (error) {
            cleanupErrors.push(`browser close failed: ${error}`);
        }

        if (cleanupErrors.length) throw new Error(cleanupErrors.join("; "));
    });

    test("a pre-existing preference is restored, not deleted", async () => {
        const sentinel = JSON.stringify(["title"]);
        await tasksTable.seedColumnVisibility(sentinel);

        await tasksTable.openFilteredTasks({ assignees: personId }, ["title", "duedate", "priority"]);
        await tasksTable.expectRowVisible(taskId);
        await expect(await tasksTable.columnVisibility()).toBe(
            JSON.stringify(["title", "duedate", "priority"])
        );

        await tasksTable.restoreColumnVisibility();
        await expect(await tasksTable.columnVisibility()).toBe(sentinel);
    });

    test("restore is a no-op when the preference was never overridden", async () => {
        const sentinel = JSON.stringify(["title", "duedate"]);
        await tasksTable.seedColumnVisibility(sentinel);
        // no `visibleColumns` argument: this scenario never overrides the preference
        await tasksTable.openFilteredTasks({ assignees: personId });
        await tasksTable.expectRowVisible(taskId);
        await tasksTable.restoreColumnVisibility();
        await expect(await tasksTable.columnVisibility()).toBe(sentinel);
    });

    test("an absent preference is restored as absent", async () => {
        await tasksTable.seedColumnVisibility(null);
        await tasksTable.openFilteredTasks({ assignees: personId }, ["title", "priority"]);
        await tasksTable.expectRowVisible(taskId);

        await tasksTable.restoreColumnVisibility();
        await expect(await tasksTable.columnVisibility()).toBe(null);
    });
});
