import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";
import BoardView from "../../pages/boardView";
import TasksTable from "../../pages/tasksTable";
import Preferences from "../../pages/preferences";
import TaskDetails from "../../pages/taskDetails";
import { ActivityLog } from "../../pages/components/ActivityLog";

const TEST_PROJECT = "Task activity";
const MAIN_COLUMN = "Column 1";
const TASK_TITLE = "Task 1";
const HOSTILE_TITLE = '<img src=x onerror="window.__securityProbe=1">';

test.describe("Project - Task activity", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let sidebar: Sidebar;
    let board: BoardView;
    let tasksTable: TasksTable;
    let projectName: string;
    let projectId: string;
    let preferences: Preferences;
    let taskDetails: TaskDetails;
    let activity: ActivityLog;
    let commentsOriginallyOn: boolean;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);
        board = new BoardView(page);
        tasksTable = new TasksTable(page);
        preferences = new Preferences(page);
        taskDetails = new TaskDetails(page);
        activity = new ActivityLog(page);

        projectName = `${TEST_PROJECT} ${Math.floor(Math.random() * 10000)}`;

        projectId = await project.addNew({ name: projectName });
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
        const count = await matchingProjects.count();
        expect(count).toBeGreaterThanOrEqual(1);
        await project.expectProjectUrl(projectId);

        await tasksTable.createStackViaApi({ projectId, title: MAIN_COLUMN });
        await project.addTask({
            project: projectName,
            column: MAIN_COLUMN,
            task: { title: TASK_TITLE },
        });

        await preferences.openTab("Task details");
        commentsOriginallyOn = await preferences.getPreferenceControl("Show comments").isChecked();
        if (!commentsOriginallyOn) await preferences.setSwitch("Task details", "Show comments", true);
        await preferences.closePreferences();

        await board.openCard(TASK_TITLE);
        await taskDetails.waitUntilOpen();
    });

    test.afterAll(async () => {
        try {
            if (commentsOriginallyOn === false)
                await preferences.toggleSetting("Task details", "Show comments", false);
            if (page && !page.isClosed() && projectId) await project.deleteById(projectId);
        } finally {
            if (page && !page.isClosed()) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();
        }
    });

    test("Should keep a renamed task title inert in the activity log", async () => {
        await test.step("Should show an activity entry for the rename", async () => {
            await taskDetails.setTitle(HOSTILE_TITLE);
            await activity.open();
            expect(await activity.countEntries()).toBeGreaterThanOrEqual(1);
        });

        await test.step("Should render the change as a diff, not raw markup", async () => {
            const entries = await activity.getEntries();
            const entry = entries.find(item => item.text.includes(HOSTILE_TITLE));
            expect(entry).toBeDefined();
            expect(entry?.removed).toEqual([TASK_TITLE]);
        });

        await test.step("Should keep the hostile title as visible text", async () => {
            const entries = await activity.getEntries();
            const entry = entries.find(item => item.text.includes(HOSTILE_TITLE));
            expect(entry?.images).toBe(0);
            expect(entry?.scripts).toBe(0);
        });
    });
});
