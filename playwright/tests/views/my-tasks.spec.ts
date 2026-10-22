import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import users from "../../config/users";
import MyTasks from "../../pages/myTasks";
import People from "../../pages/people";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";
import { closeDb, getDb } from "../../fixtures/db";

/**
 * My Tasks (`/app/mytasks`) membership and filter navigation against the real store.
 *
 * Every task is scenario-owned (its title carries `RUN_TAG`) and the membership assertions
 * only ever compare the ids this spec created, so the ~400 live projects and ~600 live tasks
 * of residue in the database never make a result indeterminate. The scenario project's group
 * is expanded through the persisted preference because My Tasks collapses every group but the
 * first (`MyTasks.tsx:63`) and a collapsed group renders no rows at all.
 *
 * Reproduce: `yarn test:e2e:headed playwright/tests/views/my-tasks.spec.ts --retries=0 --project=chrome --no-deps`
 * Companion POM contract: `pages/myTasks.ts`.
 */
const RUN_TAG = String(Date.now());
const PROJECT_NAME = `My tasks project ${RUN_TAG}`;
const STACK_TITLE = "My tasks column";
const OTHER_PERSON_TOKEN = `mytasks-other-${RUN_TAG}`;
const OTHER_PERSON_EMAIL = `${OTHER_PERSON_TOKEN}@example.com`;

const TITLE_OPEN = `My tasks open ${RUN_TAG}`;
const TITLE_OVERDUE = `My tasks overdue target ${RUN_TAG}`;
const TITLE_OVERDUE_FUTURE = `My tasks overdue target tomorrow ${RUN_TAG}`;
const TITLE_DUE_TODAY = `My tasks due today target ${RUN_TAG}`;
const TITLE_OTHER_OWNER = `My tasks other owner ${RUN_TAG}`;
const TITLE_UNASSIGNED = `My tasks unassigned ${RUN_TAG}`;
const TITLE_COMPLETED = `My tasks completed ${RUN_TAG}`;

/** Matches only the two "overdue target" titles; the future one is never overdue. */
const OVERDUE_QUERY = "overdue target";
/** Matches no title at all, so the empty state is the only possible render. */
const NO_MATCH_QUERY = `zzz-no-task-match-${RUN_TAG}`;

test.describe("My Tasks - membership and deep-linked filters", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let myTasks: MyTasks;
    let people: People;
    let project: Project;
    let tasksTable: TasksTable;
    let projectId: string;
    let stackId: string;
    let adminId: string;
    let otherPersonId: string;
    const openIds: string[] = [];
    const scenarioIds: string[] = [];
    let openTaskId: string;
    let overdueTaskId: string;
    let overdueFutureTaskId: string;
    let dueTodayTaskId: string;
    let otherOwnerTaskId: string;
    let unassignedTaskId: string;
    let completedTaskId: string;

    const seed = async (title: string, assigneeIds: string[], dueOffset?: number) => {
        const id = await tasksTable.createTaskViaApi({ projectId, stackId, title });
        if (assigneeIds.length) await tasksTable.setTaskAssigneesViaApi(id, assigneeIds);
        if (dueOffset !== undefined) {
            const dueDate = await tasksTable.dayWindowValue(dueOffset);
            await tasksTable.setTaskDueDateAndProgressViaApi(id, dueDate, 0);
        }
        scenarioIds.push(id);
        return id;
    };

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        myTasks = new MyTasks(page);
        people = new People(page);
        project = new Project(page);
        tasksTable = new TasksTable(page);

        projectId = await project.addNew({ name: PROJECT_NAME });
        stackId = await tasksTable.createStackViaApi({ projectId, title: STACK_TITLE });
        await people.open();
        otherPersonId = await people.addPerson("Mytasks", "Other owner", OTHER_PERSON_EMAIL);
        adminId = await tasksTable.getPersonIdByEmail(users.admin.username);

        openTaskId = await seed(TITLE_OPEN, [adminId]);
        overdueTaskId = await seed(TITLE_OVERDUE, [adminId], -2);
        overdueFutureTaskId = await seed(TITLE_OVERDUE_FUTURE, [adminId], 1);
        dueTodayTaskId = await seed(TITLE_DUE_TODAY, [adminId], 0);
        otherOwnerTaskId = await seed(TITLE_OTHER_OWNER, [otherPersonId]);
        unassignedTaskId = await seed(TITLE_UNASSIGNED, []);
        completedTaskId = await seed(TITLE_COMPLETED, [adminId]);
        await tasksTable.setTaskDoneViaApi(completedTaskId, true);

        openIds.push(openTaskId, overdueTaskId, overdueFutureTaskId, dueTodayTaskId);

        // the scenario project is never the first document group in a live database
        await myTasks.expandGroup(projectId);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        // every resource is torn down independently: a failing deletion must not skip the
        // others; collected errors are re-thrown after all attempts run
        const cleanupErrors: string[] = [];

        try {
            if (page && !page.isClosed() && projectId) await myTasks.clearGroupExpansion(projectId);
        } catch (error) {
            cleanupErrors.push(`group preference cleanup failed: ${error}`);
        }

        for (const taskId of scenarioIds) {
            try {
                if (page && !page.isClosed()) await tasksTable.deleteTaskViaApi(taskId);
            } catch (error) {
                cleanupErrors.push(`task ${taskId} cleanup failed: ${error}`);
            }
        }

        try {
            if (page && !page.isClosed()) await getDb().cleanupPerson(otherPersonId);
        } catch (error) {
            cleanupErrors.push(`scenario contact cleanup failed: ${error}`);
        }

        try {
            if (page && !page.isClosed()) await project.deleteById(projectId);
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
        try {
            await closeDb();
        } catch (error) {
            cleanupErrors.push(`db close failed: ${error}`);
        }

        if (cleanupErrors.length) throw new Error(cleanupErrors.join("; "));
    });

    test("my tasks lists only the open tasks assigned to the signed-in user", async () => {
        await myTasks.open();
        await myTasks.expectScenarioMembership(openIds, scenarioIds);
        await myTasks.expectQuery({ state: "todo" });

        // the server's filtered list route must agree with what the view rendered
        const serverIds = await tasksTable.filteredTaskIds({
            query: RUN_TAG,
            assignees: adminId,
            open: "true",
        });
        expect(serverIds.sort()).toEqual([...openIds].sort());

        await myTasks.reload();
        await myTasks.expectScenarioMembership(openIds, scenarioIds);
    });

    test("completing a task from my tasks removes it and shows it under the done filter", async () => {
        await tasksTable.setTaskDoneViaApi(openTaskId, true);
        await myTasks.reload();

        const withoutOpen = openIds.filter(id => id !== openTaskId);
        await myTasks.open();
        await myTasks.expectScenarioMembership(withoutOpen, scenarioIds);

        await myTasks.open({ state: "done" });
        // the scenario also seeds a permanently completed task, which belongs to this view
        await myTasks.expectScenarioMembership([openTaskId, completedTaskId], scenarioIds);

        await tasksTable.setTaskDoneViaApi(openTaskId, false);
        await myTasks.reload();
        await myTasks.open();
        await myTasks.expectScenarioMembership(openIds, scenarioIds);
    });

    test("an overdue deep link shows only the overdue task", async () => {
        await myTasks.open({ overdue: "1", q: OVERDUE_QUERY });
        await myTasks.expectQuery({ overdue: "1" });
        await myTasks.expectScenarioMembership([overdueTaskId], scenarioIds);
    });

    test("a due-today deep link keeps its results after a reload", async () => {
        await myTasks.open({ dueDate: "today" });
        await myTasks.expectQuery({ dueDate: "today" });
        await myTasks.expectScenarioMembership([dueTodayTaskId], scenarioIds);

        await myTasks.reload();
        await myTasks.expectScenarioMembership([dueTodayTaskId], scenarioIds);
    });

    test("clearing filters from the empty state restores the default list", async () => {
        await myTasks.openEmpty({ q: NO_MATCH_QUERY });

        await myTasks.clearFilters();
        await myTasks.expectParamsAbsent(["q"]);
        await myTasks.expectScenarioMembership(openIds, scenarioIds);
    });

    test("back and forward navigation keeps the deep-linked filters", async () => {
        await myTasks.open({ overdue: "1", q: OVERDUE_QUERY });
        await myTasks.open({ dueDate: "today" });

        await page.goBack();
        await myTasks.expectQuery({ overdue: "1" });
        await myTasks.expectScenarioMembership([overdueTaskId], scenarioIds);

        await page.goForward();
        await myTasks.expectQuery({ dueDate: "today" });
        await myTasks.expectScenarioMembership([dueTodayTaskId], scenarioIds);
    });

    test("project filters do not leak into my tasks and my tasks filters do not leak into a project", async () => {
        await page.goto(`/app/project/${projectId}?q=${encodeURIComponent(RUN_TAG)}&state=all`);
        await project.expectParamsAbsent(["overdue"]);

        await myTasks.open();
        await myTasks.expectParamsAbsent(["q"]);
        await myTasks.expectScenarioMembership(openIds, scenarioIds);

        await myTasks.open({ overdue: "1", q: OVERDUE_QUERY });
        await page.goto(`/app/project/${projectId}`);
        await project.expectParamsAbsent(["overdue", "q"]);
    });
});
