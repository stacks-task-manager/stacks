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
import { TaskComments } from "../../pages/components/TaskComments";
import Auth from "../../pages/auth";
import { closeDb, getDb } from "../../fixtures/db";
import { e2eBaseUrl } from "../../config/runtime";

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
    let comments: TaskComments;
    let commentsOriginallyOn: boolean;
    let collaboratorContext: BrowserContext;
    let collaboratorPage: Page;
    let collaboratorEmail: string;
    let collaboratorCreated = false;
    let collaboratorRoleTitle: string | undefined;

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
        comments = new TaskComments(page);

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

        collaboratorEmail = `comments-collaborator-${crypto.randomUUID()}@example.com`;
        collaboratorRoleTitle = await getDb().createActiveUserWithAccess(collaboratorEmail, "Comments123!", {
            people: { read: true },
            roles: { read: true },
            comments: { read: true, write: true },
        });
        collaboratorCreated = true;
        collaboratorContext = await browser.newContext({ baseURL: e2eBaseUrl });
        collaboratorPage = await collaboratorContext.newPage();
        await new Auth(collaboratorPage).loginAndWaitForAuthenticatedRequest(
            collaboratorEmail,
            "Comments123!"
        );
        await new Preferences(collaboratorPage).toggleSetting("Task details", "Show comments", true);
        await collaboratorPage.reload();
        const collaboratorPreferences = new Preferences(collaboratorPage);
        await collaboratorPreferences.openTab("Task details");
        await expect(collaboratorPreferences.getPreferenceControl("Show comments")).toBeChecked();
        await collaboratorPreferences.closePreferences();
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

        if (page && !page.isClosed() && commentsOriginallyOn === false)
            await attempt(() => preferences.toggleSetting("Task details", "Show comments", false));
        if (projectId) await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        if (page && !page.isClosed() && projectId) await attempt(() => project.deleteById(projectId));
        if (collaboratorContext) await attempt(() => collaboratorContext.close());
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (collaboratorCreated) await attempt(() => getDb().cleanupUser(collaboratorEmail));
        if (collaboratorRoleTitle) await attempt(() => getDb().cleanupRole(collaboratorRoleTitle!));
        await attempt(() => closeDb());

        if (errors.length) throw new AggregateError(errors, "Task activity fixture cleanup failed");
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

    test("Should persist, edit, cancel, and delete an own comment", async () => {
        const markup = '<img src=x onerror="window.__commentProbe=1">';
        const original = `Comment ${crypto.randomUUID()}\nsecond line\n${markup}`;
        const edited = `Edited ${crypto.randomUUID()}`;
        const id = await comments.addComment(original);
        expect(id).toBeTruthy();

        await taskDetails.reload();
        await comments.expectComment(original, true);
        await comments.expectCommentMarkupInert(id, markup);
        await comments.cancelEdit(id, original, "Canceled draft");
        await comments.editComment(id, edited);

        await taskDetails.reload();
        await comments.expectComment(edited, true);
        await comments.deleteComment(id, false);
        await comments.expectComment(edited, true);
        await comments.deleteComment(id, true);

        await taskDetails.reload();
        await comments.expectComment(edited, false);
    });

    test("Should let a standard user read but not mutate another user's comment", async () => {
        const text = `Owned comment ${crypto.randomUUID()}`;
        const taskId = await taskDetails.getTaskId();
        const commentId = await comments.addComment(text);

        try {
            const collaboratorTask = new TaskDetails(collaboratorPage);
            const collaboratorComments = new TaskComments(collaboratorPage);
            await collaboratorTask.openProjectTask(projectId, taskId);
            await collaboratorComments.expectComment(text, true);
            await collaboratorComments.expectCommentAuthor(commentId, "Admin User");
            await collaboratorComments.expectOtherAuthorActionsHidden(commentId);
            await collaboratorComments.expectOtherAuthorMutationsDenied(taskId, commentId);
            await collaboratorTask.reload();
            await collaboratorComments.expectComment(text, true);
        } finally {
            await comments.deleteComment(commentId, true);
        }
    });

    test("Should show another author's task rename in activity after reload", async () => {
        const taskId = await taskDetails.getTaskId();
        const title = `Cross-author activity ${crypto.randomUUID()}`;
        await taskDetails.setTitle(title);
        await taskDetails.reloadAndWaitForTaskData();
        await activity.open();
        await activity.expectRenameFromAuthor(title, "Admin User");

        const collaboratorTask = new TaskDetails(collaboratorPage);
        const collaboratorActivity = new ActivityLog(collaboratorPage);
        await collaboratorTask.openProjectTask(projectId, taskId);
        await collaboratorTask.reloadAndWaitForTaskData();
        await collaboratorActivity.open();
        await collaboratorActivity.expectRenameFromAuthor(title, "Admin User");
    });
});
