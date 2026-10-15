import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import users from "../../config/users";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";

/**
 * Regression coverage for in-cell edits on the filtered tasks table (`/app/tasks?…`):
 * row cells must reflect edits without a refetch.
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

test.describe("Tasks - Filtered table in-cell edits", () => {
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
        await project.addTask({ project: TEST_PROJECT, column: MAIN_COLUMN, task: { title: TASK_TITLE } });
        personId = await tasksTable.getPersonIdByEmail(users.admin.username);
        taskId = await tasksTable.waitForTaskViaApi({ projectId, title: TASK_TITLE });
        await tasksTable.assignTaskViaApi({ projectId, title: TASK_TITLE, personId });
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
});
