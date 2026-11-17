import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";
import Workbooks from "../../pages/workbooks";

/**
 * Workbooks (`/app/workbooks` and `/app/workbooks/:id`) against the real API.
 *
 * Every record is scenario-owned (`RUN_TAG`) and created in `beforeEach`, so the live
 * database residue never makes an assertion indeterminate. The matching `afterEach`
 * deletes the workbooks, tasks and projects the current test created — it runs before
 * test-scoped fixture teardown, so cleanup also happens when an assertion fails and the
 * video fixture would otherwise close the browser context.
 *
 * The workbook table uses the shared TablePersistent renderer with
 * `id="workbook:<id>"`, driven through the existing `TasksTable` POM. The overview
 * asserts the shared summary testids plus the workbook's own recent-task row.
 *
 * Reproduce: `yarn test:e2e playwright/tests/workbooks/workbooks.spec.ts --retries=0 --project=chrome --no-deps`
 */
const RUN_TAG = String(Date.now());
const PROJECT_NAME = `Workbook project ${RUN_TAG}`;
const OTHER_PROJECT_NAME = `Workbook other project ${RUN_TAG}`;
const STACK_TITLE = "Workbook column";

const OPEN_TASK = `Workbook open ${RUN_TAG}`;
const IN_PROGRESS_TASK = `Workbook in progress ${RUN_TAG}`;
const COMPLETED_TASK = `Workbook completed ${RUN_TAG}`;
const OTHER_PROJECT_TASK = `Workbook other project task ${RUN_TAG}`;

const UI_WORKBOOK_TITLE = `Workbook created from dialog ${RUN_TAG}`;
const EDIT_WORKBOOK_TITLE = `Workbook before edit ${RUN_TAG}`;
const EDITED_WORKBOOK_TITLE = `Workbook after edit ${RUN_TAG}`;
const SEARCH_HIT_TITLE = `Workbook search hit ${RUN_TAG}`;
const SEARCH_MISS_TITLE = `Workbook search miss ${RUN_TAG}`;
const SEARCH_HIT_QUERY = `search hit ${RUN_TAG}`;

test.describe("Workbooks - list, filters and overview", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let tasksTable: TasksTable;
    let workbooks: Workbooks;

    let projectId = "";
    let projectName = "";
    let otherProjectId = "";
    let stackId = "";
    let otherStackId = "";

    let openTaskId = "";
    let inProgressTaskId = "";
    let completedTaskId = "";
    let otherProjectTaskId = "";

    const taskIds: string[] = [];
    const workbookIds: string[] = [];

    const workbookTable = (workbookId: string) => new TasksTable(page, `workbook:${workbookId}`);

    const seedScenario = async (testTitle: string) => {
        const suffix = testTitle.replace(/[^a-z0-9]+/gi, "-").slice(0, 50);

        projectId = await project.addNew({ name: `${PROJECT_NAME} ${suffix}` });
        projectName = `${PROJECT_NAME} ${suffix}`;
        stackId = await tasksTable.createStackViaApi({ projectId, title: STACK_TITLE });

        otherProjectId = await project.addNew({ name: `${OTHER_PROJECT_NAME} ${suffix}` });
        otherStackId = await tasksTable.createStackViaApi({
            projectId: otherProjectId,
            title: STACK_TITLE,
        });

        openTaskId = await tasksTable.createTaskViaApi({ projectId, stackId, title: OPEN_TASK });
        taskIds.push(openTaskId);

        inProgressTaskId = await tasksTable.createTaskViaApi({
            projectId,
            stackId,
            title: IN_PROGRESS_TASK,
        });
        taskIds.push(inProgressTaskId);

        completedTaskId = await tasksTable.createTaskViaApi({
            projectId,
            stackId,
            title: COMPLETED_TASK,
        });
        taskIds.push(completedTaskId);

        otherProjectTaskId = await tasksTable.createTaskViaApi({
            projectId: otherProjectId,
            stackId: otherStackId,
            title: OTHER_PROJECT_TASK,
        });
        taskIds.push(otherProjectTaskId);

        await tasksTable.setTaskProgressViaApi(inProgressTaskId, 50);
        await tasksTable.setTaskDoneViaApi(completedTaskId, true);
    };

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        tasksTable = new TasksTable(page);
        workbooks = new Workbooks(page);
    });

    test.beforeEach(async ({ attachVideoContext }: any, testInfo) => {
        attachVideoContext(context);
        await seedScenario(testInfo.title);
    });

    test.afterEach(async () => {
        const cleanupErrors: string[] = [];
        const attempt = async (label: string, action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                cleanupErrors.push(`${label}: ${error}`);
            }
        };

        for (const workbookId of workbookIds) {
            await attempt(`workbook ${workbookId} cleanup`, () => workbooks.deleteViaApi(workbookId));
        }
        for (const taskId of taskIds) {
            await attempt(`task ${taskId} cleanup`, () => tasksTable.deleteTaskViaApi(taskId));
        }
        if (projectId) {
            await attempt("scenario project cleanup", () => project.deleteById(projectId));
        }
        if (otherProjectId) {
            await attempt("other project cleanup", () => project.deleteById(otherProjectId));
        }

        workbookIds.length = 0;
        taskIds.length = 0;
        projectId = "";
        projectName = "";
        otherProjectId = "";
        stackId = "";
        otherStackId = "";
        openTaskId = "";
        inProgressTaskId = "";
        completedTaskId = "";
        otherProjectTaskId = "";

        if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Workbooks cleanup failed");
    });

    test.afterAll(async () => {
        const cleanupErrors: string[] = [];
        const attempt = async (label: string, action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                cleanupErrors.push(`${label}: ${error}`);
            }
        };

        await attempt("close page", () => page.close());
        await attempt("close context", () => context.close());
        await attempt("close browser", () => browser.close());

        if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Workbooks teardown failed");
    });

    test("creates a workbook with a project filter and shows its tasks", async () => {
        await workbooks.open();
        await workbooks.openCreateDialog();
        await workbooks.fillTitle(UI_WORKBOOK_TITLE);
        await workbooks.selectProject(projectId, projectName);
        const workbookId = await workbooks.saveDialog();
        workbookIds.push(workbookId);

        await workbooks.expectToolbarTitle(UI_WORKBOOK_TITLE);
        await workbooks.waitForTasks(workbookId);

        const table = workbookTable(workbookId);
        await table.expectRowVisible(openTaskId);
        await table.expectRowVisible(inProgressTaskId);
        await table.expectRowAbsent(completedTaskId);
        await table.expectRowAbsent(otherProjectTaskId);
        await table.expectRowCount(2);

        await workbooks.reloadWorkbook();
        await workbooks.waitForTasks(workbookId);
        await table.expectRowVisible(openTaskId);
        await table.expectRowAbsent(otherProjectTaskId);

        const record = (await workbooks.listViaApi()).find(workbook => workbook.id === workbookId);
        expect(record, `workbook ${workbookId} is missing from the API list`).toBeDefined();
        expect(record.filters.projects).toEqual([projectId]);
        expect(record.filters.state).toBe("todo");
    });

    test("filters the list by title and deletes a workbook from its menu", async () => {
        const hitId = await workbooks.createViaApi({
            title: SEARCH_HIT_TITLE,
            filters: { projects: [projectId] },
        });
        workbookIds.push(hitId);
        const missId = await workbooks.createViaApi({
            title: SEARCH_MISS_TITLE,
            filters: { projects: [projectId] },
        });
        workbookIds.push(missId);

        await workbooks.open();
        await workbooks.expectRenderedWorkbooks([hitId, missId]);

        await workbooks.setQuery(SEARCH_HIT_QUERY);
        await workbooks.expectRenderedWorkbooks([hitId]);
        await workbooks.expectWorkbookAbsent(missId);

        await workbooks.clearQuery();
        await workbooks.expectRenderedWorkbooks([hitId, missId]);

        await workbooks.openWorkbookFromList(missId);
        await workbooks.deleteFromMenu(missId);

        await workbooks.expectWorkbookAbsent(missId);
        await workbooks.expectWorkbookPresent(hitId);

        await workbooks.reloadList();
        await workbooks.expectWorkbookAbsent(missId);
        await workbooks.expectWorkbookPresent(hitId);

        const listed = await workbooks.listViaApi();
        expect(
            listed.filter(workbook => workbook.id === missId),
            `deleted workbook ${missId} is still listed`
        ).toHaveLength(0);
    });

    test("summarizes the workbook tasks in the overview", async () => {
        const workbookId = await workbooks.createViaApi({
            title: `Workbook overview ${RUN_TAG}`,
            filters: { projects: [projectId], state: "all" },
        });
        workbookIds.push(workbookId);

        await workbooks.openWorkbook(workbookId);
        await workbooks.selectView("overview");

        await workbooks.expectSummary({ idle: 1, inProgress: 1, completed: 1 });
        await workbooks.expectRecentTask(completedTaskId);

        await workbooks.reloadWorkbook();
        await workbooks.selectView("overview");
        await workbooks.expectSummary({ idle: 1, inProgress: 1, completed: 1 });
        await workbooks.expectRecentTask(completedTaskId);
    });

    test("edits a workbook title and filter and persists both", async () => {
        const workbookId = await workbooks.createViaApi({
            title: EDIT_WORKBOOK_TITLE,
            filters: { projects: [projectId], state: "all" },
        });
        workbookIds.push(workbookId);

        await workbooks.openWorkbook(workbookId);
        await workbooks.waitForTasks(workbookId);

        const table = workbookTable(workbookId);
        await table.expectRowCount(3);

        await workbooks.openEditFilters();
        await workbooks.expectDialogTitle(EDIT_WORKBOOK_TITLE);
        await workbooks.fillTitle(EDITED_WORKBOOK_TITLE);
        await workbooks.enableInProgressFilter();
        await workbooks.saveEditDialog();

        await workbooks.expectToolbarTitle(EDITED_WORKBOOK_TITLE);
        await table.expectRowVisible(inProgressTaskId);
        await table.expectRowAbsent(openTaskId);
        await table.expectRowAbsent(completedTaskId);
        await table.expectRowCount(1);

        await workbooks.reloadWorkbook();
        await workbooks.waitForTasks(workbookId);
        await table.expectRowVisible(inProgressTaskId);
        await table.expectRowCount(1);

        const record = (await workbooks.listViaApi()).find(workbook => workbook.id === workbookId);
        expect(record, `workbook ${workbookId} is missing from the API list`).toBeDefined();
        expect(record.title).toBe(EDITED_WORKBOOK_TITLE);
        expect(record.filters.inProgress).toBe(true);
        expect(record.filters.projects).toEqual([projectId]);
    });
});
