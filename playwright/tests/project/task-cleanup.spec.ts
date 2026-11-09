import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import { closeDb, getDb } from "../../fixtures/db";
import Project from "../../pages/project";
import BoardView from "../../pages/boardView";

test.describe("Project - Failure-path task cleanup", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let board: BoardView;
    let projectId: string;

    // Register before the first mutation, including beforeAll failures.
    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        if (projectId) await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        if (projectId && page && !page.isClosed()) await attempt(() => project.deleteById(projectId));
        await attempt(closeDb);
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "Failure-path fixture cleanup failed");
    });

    test.beforeAll(async ({ login }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });
        project = new Project(page);
        board = new BoardView(page);
        projectId = await project.addNew({ name: `E00 cleanup ${crypto.randomUUID()}` });
    });

    test.beforeEach(({ attachVideoContext }: any) => attachVideoContext(context));

    test("Should remove scenario task records after an intentionally failing assertion", async () => {
        const title = `Disposable task ${crypto.randomUUID()}`;
        const stackId = await board.addColumn("Cleanup column");
        await board.addTaskToStack(stackId, title);
        const taskId = await board.getCardIdByName(title);
        expect((await getDb().getTaskRecordCounts(taskId)).tasks).toBe(1);
        expect((await getDb().getTaskRecordCounts(taskId)).permissions).toBe(1);

        await expect(async () => {
            try {
                expect(taskId).toBe("intentional-cleanup-assertion-failure");
            } finally {
                await getDb().cleanupProjectTaskRecords(projectId);
            }
        }).rejects.toThrow("intentional-cleanup-assertion-failure");

        expect(await getDb().getTaskRecordCounts(taskId)).toEqual({
            tasks: 0,
            activities: 0,
            timelogs: 0,
            permissions: 0,
            notifications: 0,
        });
    });
});
