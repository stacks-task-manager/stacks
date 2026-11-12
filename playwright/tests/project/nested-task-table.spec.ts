import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";

const RUN_TAG = String(Date.now());
const PROJECT_NAME = `Nested task table project ${RUN_TAG}`;
const STACK_TITLE = "Nested task table";

test.describe("Project - Persistent Table nested tasks", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let tasksTable: TasksTable;
    let projectId: string;
    let stackId: string;
    const taskIds: string[] = [];

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        tasksTable = new TasksTable(page, "project");

        projectId = await project.addNew({ name: PROJECT_NAME });
        stackId = await tasksTable.createStackViaApi({ projectId, title: STACK_TITLE });

        let parentId: string | undefined;
        for (let level = 1; level <= 5; level++) {
            parentId = await tasksTable.createTaskViaApi({
                projectId,
                stackId,
                title: `Nested task level ${level} ${RUN_TAG}`,
                parentId,
            });
            taskIds.push(parentId);
        }
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        const cleanupErrors: string[] = [];

        for (const taskId of [...taskIds].reverse()) {
            try {
                if (page && !page.isClosed()) await tasksTable.deleteTaskViaApi(taskId);
            } catch (error) {
                cleanupErrors.push(`task ${taskId} cleanup failed: ${error}`);
            }
        }

        try {
            if (page && !page.isClosed() && stackId) await tasksTable.deleteStackViaApi(stackId);
        } catch (error) {
            cleanupErrors.push(`stack cleanup failed: ${error}`);
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

    test("renders five nested levels with tree connector lines", async () => {
        await project.openListView(projectId, { showSubtasks: "1" });
        await tasksTable.expectNestedTaskTree(taskIds);
    });
});
