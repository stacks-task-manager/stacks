import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import users from "../../config/users";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";

/**
 * Regression coverage for in-cell edits and filter navigation on the filtered tasks table
 * (`/app/tasks?…`): row cells must reflect edits without a refetch, and every new filter key
 * (priority, tag, status, progress, due/start windows) must agree with the filtered API route.
 * The created tag and status are reused across runs because tags have no DELETE route.
 *
 * Reproduce: `yarn playwright test tests/views/tasks-filtered-table.spec.ts --project=chrome --retries=0`
 * Companion POM contract: `tests/views/tasks-table-columns.spec.ts`.
 *
 * Reproducing the test-side evidence: copy the `playwright/` test files and
 * `playwright/.auth/user.json` into a scratch dir, symlink the live `node_modules`, then run
 * `yarn playwright test --config=<scratch>/playwright.config.ts …` from the live checkout. The
 * live servers keep serving the live app, which is what a mutation of test-side code (break
 * `restoreColumnVisibility`, make an `afterAll` `try` block throw) needs.
 *
 * NOT REPRODUCIBLE AS WRITTEN: a fully isolated application-regression run (serving a
 * pre-fix checkout and driving the browser at it) has not been performed. Two things
 * block it without further fixture changes, which were deliberately not added here:
 * `playwright/fixtures/bootstrapContext.ts` hardcodes `baseURL: "http://localhost:3000"`, so
 * overriding `use.baseURL` in the config would not redirect these tests; and the server's
 * reverse-proxy target for `/app/*` and `/static/*` is hardcoded to `localhost:3001`
 * (`packages/server/src/api.ts`), so a scratch app has to own that port while the live dev
 * servers are stopped. `webServer.url` in the config also stays pointed at the frontend on
 * 3001, not at the API port.
 *
 * The only pre-fix evidence available comes from recompiling the live dev server with the
 * pre-fix `Tasks.tsx` — a shared-checkout experiment, because nothing here can isolate the
 * app. With that code served, the two post-edit value assertions fail and the cells render
 * empty. Treat that as a one-off observation, not a command to re-run.
 */
const TEST_PROJECT = `Filtered tasks table project ${Date.now()}`;
const TASK_TITLE = `Filtered table edit target ${Date.now()}`;
const MAIN_COLUMN = "Column 1";
const WINDOW_TITLE = `Filtered window target ${Date.now()}`;
// Fixed labels: tags and statuses have no DELETE route, so repeated runs reuse the same rows
// (findOrCreateTagViaApi looks up by title first) instead of accumulating one pair per run.
const TAG_TITLE = "Tasks filtered table tag";
const OTHER_TAG_TITLE = "Tasks filtered table other tag";
const STATUS_TITLE = "Tasks filtered table status";

test.describe("Tasks - Filtered table in-cell edits", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let tasksTable: TasksTable;
    let projectId: string;
    let personId: string;
    let taskId: string;
    let windowTaskId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        tasksTable = new TasksTable(page);

        projectId = await project.addNew({ name: TEST_PROJECT });
        await tasksTable.createStackViaApi({ projectId, title: MAIN_COLUMN });
        await project.addTask({ project: TEST_PROJECT, column: MAIN_COLUMN, task: { title: TASK_TITLE } });
        personId = await tasksTable.getPersonIdByEmail(users.admin.username);
        taskId = await tasksTable.waitForTaskViaApi({ projectId, title: TASK_TITLE });
        await tasksTable.assignTaskViaApi({ projectId, title: TASK_TITLE, personId });

        // a second task keeps the window/tag/status scenarios independent of the dates set above
        await project.addTask({ project: TEST_PROJECT, column: MAIN_COLUMN, task: { title: WINDOW_TITLE } });
        windowTaskId = await tasksTable.waitForTaskViaApi({ projectId, title: WINDOW_TITLE });
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    // the seeded column-visibility preference must not leak between scenarios,
    // even when an assertion fails mid-scenario
    test.afterEach(async () => {
        await tasksTable.restoreColumnVisibility();
    });

    test.afterAll(async () => {
        // every resource is cleaned up independently: a failing deletion must not
        // skip the others; collected errors are re-thrown after all attempts run
        const cleanupErrors: string[] = [];

        try {
            if (page && !page.isClosed() && taskId) await tasksTable.deleteTaskViaApi(taskId);
        } catch (error) {
            cleanupErrors.push(`task cleanup failed: ${error}`);
        }

        try {
            if (page && !page.isClosed() && windowTaskId) await tasksTable.deleteTaskViaApi(windowTaskId);
        } catch (error) {
            cleanupErrors.push(`window task cleanup failed: ${error}`);
        }
        try {
            if (page && !page.isClosed() && projectId) await project.deleteById(projectId);
        } catch (error) {
            cleanupErrors.push(`project cleanup failed: ${error}`);
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

    test("updating the priority in a cell updates the table row", async () => {
        // the filtered table hides the priority column by default — enable it for this scenario
        await tasksTable.openFilteredTasks({ assignees: personId }, [
            "title",
            "duedate",
            "priority",
            "progress",
        ]);
        await tasksTable.expectRowVisible(taskId);

        await tasksTable.expectCellTextNot(taskId, "priority", "High");
        await tasksTable.setPriority(taskId, "high");
        await tasksTable.expectCellText(taskId, "priority", "High");
    });

    test("setting a due date in a cell updates the table row", async () => {
        await tasksTable.openFilteredTasks({ assignees: personId });
        await tasksTable.expectRowVisible(taskId);

        await tasksTable.setDueDateToTomorrow(taskId);
        await tasksTable.expectDueDateShowsTomorrow(taskId);
    });

    test("narrows the filtered table with a priority and a due-date window", async () => {
        await tasksTable.openFilteredTasks({ project: projectId }, ["title", "duedate", "priority"]);
        await tasksTable.expectRowVisible(windowTaskId);
        // set the date before the priority picker opens its menu, so no overlay blocks the next click
        await tasksTable.setDueDateToTomorrow(windowTaskId);
        await tasksTable.expectDueDateShowsTomorrow(windowTaskId);
        await tasksTable.setPriority(windowTaskId, "high");
        await tasksTable.expectCellText(windowTaskId, "priority", "High");

        const tomorrow = await tasksTable.dayWindowValue(1);
        const dayAfter = await tasksTable.dayWindowValue(2);

        // the filtered API answer is awaited before the rendered row is asserted
        expect(await tasksTable.filteredTaskIds({ project: projectId, priority: "high" })).toContain(
            windowTaskId
        );
        await tasksTable.openFilteredTasks({ project: projectId, priority: "high" }, ["title", "priority"]);
        await tasksTable.expectRowVisible(windowTaskId);

        expect(
            (await tasksTable.filteredTaskIds({ project: projectId, priority: "low" })).includes(windowTaskId)
        ).toBe(false);
        await tasksTable.gotoEmptyFilteredTasks({ project: projectId, priority: "low" });
        await tasksTable.expectRowAbsent(windowTaskId);

        expect(
            await tasksTable.filteredTaskIds({ project: projectId, dueFrom: tomorrow, dueTo: tomorrow })
        ).toContain(windowTaskId);
        await tasksTable.openFilteredTasks({ project: projectId, dueFrom: tomorrow, dueTo: tomorrow }, [
            "title",
            "duedate",
        ]);
        await tasksTable.expectRowVisible(windowTaskId);

        expect(
            (
                await tasksTable.filteredTaskIds({ project: projectId, dueFrom: dayAfter, dueTo: dayAfter })
            ).includes(windowTaskId)
        ).toBe(false);
        await tasksTable.gotoEmptyFilteredTasks({ project: projectId, dueFrom: dayAfter, dueTo: dayAfter });
        await tasksTable.expectRowAbsent(windowTaskId);

        // combined filters stay compatible: project, priority, and the window together
        expect(
            await tasksTable.filteredTaskIds({
                project: projectId,
                priority: "high",
                dueFrom: tomorrow,
                dueTo: tomorrow,
            })
        ).toContain(windowTaskId);
        await tasksTable.openFilteredTasks(
            { project: projectId, priority: "high", dueFrom: tomorrow, dueTo: tomorrow },
            ["title", "priority", "duedate"]
        );
        await tasksTable.expectRowVisible(windowTaskId);
    });

    test("filters the table by tag, status, and progress", async () => {
        const tagId = await tasksTable.findOrCreateTagViaApi({ title: TAG_TITLE, type: "tag" });
        const otherTagId = await tasksTable.findOrCreateTagViaApi({ title: OTHER_TAG_TITLE, type: "tag" });
        const statusId = await tasksTable.findOrCreateTagViaApi({ title: STATUS_TITLE, type: "status" });
        await tasksTable.setTaskTagsViaApi(windowTaskId, [tagId]);
        await tasksTable.setTaskStatusViaApi(windowTaskId, statusId);
        await tasksTable.setTaskProgressViaApi(windowTaskId, 60);

        expect(await tasksTable.filteredTaskIds({ project: projectId, tags: tagId })).toContain(windowTaskId);
        await tasksTable.openFilteredTasks({ project: projectId, tags: tagId }, ["title"]);
        await tasksTable.expectRowVisible(windowTaskId);

        expect(
            (await tasksTable.filteredTaskIds({ project: projectId, tags: otherTagId })).includes(
                windowTaskId
            )
        ).toBe(false);
        await tasksTable.gotoEmptyFilteredTasks({ project: projectId, tags: otherTagId });
        await tasksTable.expectRowAbsent(windowTaskId);

        expect(await tasksTable.filteredTaskIds({ project: projectId, status: statusId })).toContain(
            windowTaskId
        );
        await tasksTable.openFilteredTasks({ project: projectId, status: statusId }, ["title"]);
        await tasksTable.expectRowVisible(windowTaskId);

        expect(
            (await tasksTable.filteredTaskIds({ project: projectId, status: tagId })).includes(windowTaskId)
        ).toBe(false);
        await tasksTable.gotoEmptyFilteredTasks({ project: projectId, status: tagId });
        await tasksTable.expectRowAbsent(windowTaskId);

        expect(await tasksTable.filteredTaskIds({ project: projectId, progress: "gt:50" })).toContain(
            windowTaskId
        );
        await tasksTable.openFilteredTasks({ project: projectId, progress: "gt:50" }, ["title", "progress"]);
        await tasksTable.expectRowVisible(windowTaskId);

        expect(
            (await tasksTable.filteredTaskIds({ project: projectId, progress: "gte:70" })).includes(
                windowTaskId
            )
        ).toBe(false);
        await tasksTable.gotoEmptyFilteredTasks({ project: projectId, progress: "gte:70" });
        await tasksTable.expectRowAbsent(windowTaskId);
    });

    test("combines assignee, overdue, and progress filters in the task list", async () => {
        const overdueDate = "2020-01-01T00:00:00.000Z";
        await tasksTable.assignTaskViaApi({ projectId, title: WINDOW_TITLE, personId });
        for (const [id, progress] of [
            [taskId, 0],
            [windowTaskId, 60],
        ] as const) {
            const response = await page.request.patch(`/api/tasks/${id}`, {
                data: { duedate: overdueDate, progress },
            });
            if (!response.ok()) {
                throw new Error(`Preparing filtered task failed with HTTP ${response.status()}`);
            }
        }

        const filters = { assignees: personId, overdue: "true", progress: "gt:30" };
        expect(await tasksTable.filteredTaskIds({ project: projectId, ...filters })).toEqual([windowTaskId]);

        await tasksTable.openFilteredTasks({ project: projectId, ...filters }, ["title", "progress"]);
        await tasksTable.expectRowVisible(windowTaskId);
        await tasksTable.expectRowAbsent(taskId);
    });
});
