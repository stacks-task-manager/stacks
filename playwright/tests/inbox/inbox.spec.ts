import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import Auth from "../../pages/auth";
import Inbox from "../../pages/inbox";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";
import { e2eBaseUrl } from "../../config/runtime";

/**
 * Inbox at `/app/inbox` against the real API.
 *
 * Notifications are produced by the server when a task is assigned to another user
 * (`packages/server/src/loaders/tasks.ts:801-856`), so the scenario owns the whole graph:
 * a dynamically created user, a project, a task assigned to that user, and the notification
 * row the assignment creates. Everything is deleted by captured id before the spec file
 * ends, and the notification/user absence is asserted.
 */
const TOKEN = `e2e-inbox-${Date.now()}`;
const VIEWER_EMAIL = `${TOKEN}-viewer@example.com`;
const EMPTY_EMAIL = `${TOKEN}-empty@example.com`;
const PASSWORD = "InboxScenario123!";
const TASK_TITLE = `Inbox assigned task ${TOKEN}`;
const ASSIGNMENT_SUBJECT = "You have been assigned to a task";
const SCENARIO_ACCESS = {
    reports: { read: true },
    people: { read: true, write: true },
    companies: { read: true, write: true },
    calendar: { read: true, write: true },
    comments: { read: true, write: true },
    project_settings: { read: true, write: true },
    timelogs: { read: true, write: true },
    roles: { read: true, write: true },
};

async function cleanup(actions: Array<[string, () => Promise<unknown>]>) {
    const errors: unknown[] = [];
    for (const [label, action] of actions) {
        try {
            await action();
        } catch (error) {
            errors.push(new Error(`${label}: ${error}`));
        }
    }
    if (errors.length) throw new AggregateError(errors, "Inbox scenario cleanup failed");
}

test.describe("Inbox", () => {
    let browser: Browser;
    let adminContext: BrowserContext;
    let viewerContext: BrowserContext;
    let emptyContext: BrowserContext;
    let adminPage: Page;
    let viewerPage: Page;
    let emptyPage: Page;
    let inbox: Inbox;
    let emptyInbox: Inbox;
    let project: Project;
    let tasks: TasksTable;

    let projectId: string | undefined;
    let taskId: string | undefined;
    let viewerRoleTitle: string | undefined;
    let emptyRoleTitle: string | undefined;

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context: adminContext, page: adminPage } = await bootstrapContext());
        await login({ page: adminPage });

        viewerRoleTitle = await getDb().createActiveUserWithAccess(VIEWER_EMAIL, PASSWORD, SCENARIO_ACCESS);
        emptyRoleTitle = await getDb().createActiveUserWithAccess(EMPTY_EMAIL, PASSWORD, SCENARIO_ACCESS);

        viewerContext = await browser.newContext({ baseURL: e2eBaseUrl });
        viewerPage = await viewerContext.newPage();
        await new Auth(viewerPage).loginAndWaitForAuthenticatedRequest(VIEWER_EMAIL, PASSWORD);

        emptyContext = await browser.newContext({ baseURL: e2eBaseUrl });
        emptyPage = await emptyContext.newPage();
        await new Auth(emptyPage).loginAndWaitForAuthenticatedRequest(EMPTY_EMAIL, PASSWORD);

        inbox = new Inbox(viewerPage);
        emptyInbox = new Inbox(emptyPage);
        project = new Project(adminPage);
        tasks = new TasksTable(adminPage);
    });

    test.afterEach(async () => {
        const ownedProjectId = projectId;
        const ownedTaskId = taskId;
        projectId = undefined;
        taskId = undefined;

        await cleanup([
            [
                `task records for project ${ownedProjectId}`,
                async () => {
                    if (ownedProjectId) await getDb().cleanupProjectTaskRecords(ownedProjectId);
                },
            ],
            [
                `notification absence for task ${ownedTaskId}`,
                async () => {
                    if (!ownedTaskId) return;
                    const counts = await getDb().getTaskRecordCounts(ownedTaskId);
                    if (counts.tasks !== 0 || counts.notifications !== 0) {
                        throw new Error(`Task ${ownedTaskId} retains records: ${JSON.stringify(counts)}`);
                    }
                },
            ],
            [
                `project ${ownedProjectId}`,
                async () => {
                    if (ownedProjectId) await project.deleteById(ownedProjectId);
                },
            ],
        ]);
    });

    test.afterAll(async () => {
        const actions: Array<[string, () => Promise<unknown>]> = [
            ["close viewer context", async () => (viewerContext ? viewerContext.close() : undefined)],
            ["close empty context", async () => (emptyContext ? emptyContext.close() : undefined)],
            ["close admin context", async () => (adminContext ? adminContext.close() : undefined)],
            ["close browser", async () => (browser ? browser.close() : undefined)],
            ["delete viewer user", () => getDb().cleanupUser(VIEWER_EMAIL)],
            ["delete empty user", () => getDb().cleanupUser(EMPTY_EMAIL)],
            [
                "delete viewer role",
                async () => {
                    if (viewerRoleTitle) await getDb().cleanupRole(viewerRoleTitle);
                },
            ],
            [
                "delete empty role",
                async () => {
                    if (emptyRoleTitle) await getDb().cleanupRole(emptyRoleTitle);
                },
            ],
            ["close db", () => closeDb()],
        ];
        await cleanup(actions);
    });

    test("renders the blank slate and the empty detail pane when the user has no notifications", async () => {
        await emptyInbox.open();
        await emptyInbox.expectBlankSlate();
        await emptyInbox.expectDetailEmpty();
    });

    test("selecting a notification shows its detail, marks it read, and opens the record", async () => {
        const createdProjectId = await project.addNew({ name: `Inbox project ${TOKEN}` });
        if (!createdProjectId) throw new Error("Project creation did not return an id");
        projectId = createdProjectId;
        const stackId = await tasks.createStackViaApi({
            projectId: createdProjectId,
            title: `Inbox stack ${TOKEN}`,
        });
        const createdTaskId = await tasks.createTaskViaApi({
            projectId: createdProjectId,
            stackId,
            title: TASK_TITLE,
        });
        taskId = createdTaskId;

        const personId = await tasks.getPersonIdByEmail(VIEWER_EMAIL);
        await tasks.setTaskAssigneesViaApi(createdTaskId, [personId]);

        await inbox.open();
        const notificationId = await inbox.notificationIdForMessage(TASK_TITLE);
        await inbox.expectUnread(notificationId);
        await inbox.expectDetailEmpty();

        await inbox.select(notificationId);
        await inbox.expectDetailSubject(ASSIGNMENT_SUBJECT);
        await inbox.expectDetailMessage(TASK_TITLE);
        await inbox.expectDetailActionVisible();
        await inbox.expectRead(notificationId);

        const path = await inbox.clickDetailAction();
        expect(path).toBe(`/app/tasks/${createdTaskId}`);

        // The list only holds unread notifications, so a full reload proves the read state
        // was persisted on the server rather than only in the page-scoped store.
        await inbox.open();
        await inbox.expectNotificationAbsent(notificationId);
        await inbox.expectBlankSlate();
        await inbox.expectDetailEmpty();
    });
});
