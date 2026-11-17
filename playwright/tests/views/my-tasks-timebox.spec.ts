import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import users from "../../config/users";
import MyTasks from "../../pages/myTasks";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";

/**
 * My Tasks schedule / timebox view (`/app/mytasks` → Schedule).
 *
 * The timebox (board + calendar) is a rendered mode of the top-level My Tasks view that had no
 * test coverage before this spec. It drives the view through its toolbar: switch to Schedule and
 * see the board render, switch the sub-view between the board and each calendar width, navigate
 * the date span with the toolbar buttons and with the bound keys, return to today, and confirm a
 * dated task lands in the slot for its day. The schedule state is in-memory only
 * (`packages/app/src/app/store/myTasks.ts`, no storage layer), so a reload returns to the list
 * view — the reset is asserted rather than persistence.
 *
 * Reproduce: `yarn test:e2e playwright/tests/views/my-tasks-timebox.spec.ts --retries=0`
 * Companion POM contract: `pages/myTasks.ts`.
 */
const RUN_TAG = String(Date.now());
const PROJECT_NAME = `My tasks timebox project ${RUN_TAG}`;
const STACK_TITLE = "My tasks timebox column";
const TASK_TITLE = `My tasks timebox dated task ${RUN_TAG}`;

test.describe("My Tasks - schedule / timebox view", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let myTasks: MyTasks;
    let project: Project;
    let tasksTable: TasksTable;
    let projectId: string;
    let stackId: string;
    let datedTaskId: string;
    const cleanupErrors: string[] = [];

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        myTasks = new MyTasks(page);
        project = new Project(page);
        tasksTable = new TasksTable(page);

        projectId = await project.addNew({ name: PROJECT_NAME });
        stackId = await tasksTable.createStackViaApi({ projectId, title: STACK_TITLE });

        const adminId = await tasksTable.getPersonIdByEmail(users.admin.username);
        datedTaskId = await tasksTable.createTaskViaApi({ projectId, stackId, title: TASK_TITLE });
        await tasksTable.setTaskAssigneesViaApi(datedTaskId, [adminId]);
        await tasksTable.setTaskStartDateViaApi(datedTaskId, await tasksTable.dayWindowValue(0));

        // The scenario project is never the first document group in a live database, so expand its
        // group (persisted preference) so the list render is settled before the schedule tests run.
        await myTasks.expandGroup(projectId);
    });

    test.afterAll(async () => {
        const guarded = async (step: string, action: () => Promise<unknown>) => {
            try {
                if (page && !page.isClosed()) await action();
            } catch (error) {
                cleanupErrors.push(`${step} failed: ${error}`);
            }
        };

        await guarded("restore list view", () => myTasks.openList());
        await guarded("task cleanup", () => tasksTable.deleteTaskViaApi(datedTaskId));
        await guarded("group preference cleanup", () => myTasks.clearGroupExpansion(projectId));
        await guarded("project cleanup", () => project.deleteById(projectId));

        await context?.close().catch(() => undefined);
        await browser?.close().catch(() => undefined);

        if (cleanupErrors.length) {
            throw new Error(`Cleanup incomplete:\n- ${cleanupErrors.join("\n- ")}`);
        }
    });

    test("switching to Schedule renders the timebox board", async () => {
        await myTasks.open();
        await myTasks.openSchedule();
        await myTasks.expectScheduleView("board");
        await myTasks.openList();
    });

    test("the sub-view switches between the board and each calendar width", async () => {
        await myTasks.open();
        await myTasks.openSchedule();

        await myTasks.selectScheduleBoard();
        await myTasks.expectScheduleView("board");

        await myTasks.selectCalendarOne();
        await myTasks.expectScheduleView("calendar");

        await myTasks.selectCalendarThree();
        await myTasks.expectScheduleView("calendar");

        await myTasks.selectCalendarWeekdays();
        await myTasks.expectScheduleView("calendar");

        await myTasks.selectCalendarWeek();
        await myTasks.expectScheduleView("calendar");

        await myTasks.selectCalendarMonth();
        await myTasks.expectScheduleView("calendar");

        // Leave the view on the board so the next scenario starts from a known state.
        await myTasks.selectScheduleBoard();
        await myTasks.expectScheduleView("board");
        await myTasks.openList();
    });

    test("the date span navigates with the toolbar buttons and the bound keys", async () => {
        await myTasks.open();
        await myTasks.openSchedule();

        const initial = await myTasks.getDateLabelText();

        // Toolbar buttons.
        await myTasks.moveSpan("next");
        await expect.poll(async () => (await myTasks.getDateLabelText()) !== initial).toBe(true);
        await myTasks.moveSpan("prev");
        await expect.poll(async () => (await myTasks.getDateLabelText()) === initial).toBe(true);

        // Keyboard: right advances, left returns.
        await myTasks.pressNavKey("Right");
        await expect.poll(async () => (await myTasks.getDateLabelText()) !== initial).toBe(true);
        await myTasks.pressNavKey("Left");
        await expect.poll(async () => (await myTasks.getDateLabelText()) === initial).toBe(true);

        await myTasks.openList();
    });

    test("'Go to Today' returns to today", async () => {
        await myTasks.open();
        await myTasks.openSchedule();

        // Move away from today so the Today control is offered, then return to today.
        await myTasks.moveSpan("next");
        await myTasks.goToToday();
        // goToToday asserts the Today control is gone again, i.e. the span is back on today.
        await myTasks.openList();
    });

    test("a dated task appears in the timebox slot for its day", async () => {
        await myTasks.open();
        await myTasks.openSchedule();

        const todayKey = await page.evaluate(() => {
            const day = new Date();
            const month = String(day.getMonth() + 1).padStart(2, "0");
            const date = String(day.getDate()).padStart(2, "0");
            return `${day.getFullYear()}-${month}-${date}`;
        });

        await myTasks.expectTaskInSlot(todayKey, datedTaskId);
        await myTasks.openList();
    });

    test("a reload returns to the list view", async () => {
        await myTasks.open();
        await myTasks.openSchedule();
        await myTasks.expectScheduleView("board");

        await myTasks.reload();
        // The schedule state is in-memory only, so a fresh load starts on the list.
        await expect(myTasks.view()).toBeVisible();
        await expect(myTasks.board()).toBeHidden();
    });
});
