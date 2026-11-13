import {
    request,
    type APIRequestContext,
    type Browser,
    type BrowserContext,
    type Page,
} from "@playwright/test";
import { e2eBaseUrl } from "../../config/runtime";
import { addDays, format } from "date-fns";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import BoardView from "../../pages/boardView";
import Gantt from "../../pages/gantt";

test.describe("Project - Internal Gantt", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let gantt: Gantt;
    let cleanup: APIRequestContext;
    let projectId: string;
    let parent: string;
    let child: string;
    let originalVisual: { darkMode: boolean; embeddedTask: boolean };
    let changedVisual = false;
    test.beforeAll(async ({ login }) => {
        ({ browser, context, page } = await bootstrapContext());
        await login({ page });
        cleanup = await request.newContext({
            baseURL: e2eBaseUrl,
            storageState: await context.storageState(),
        });
        project = new Project(page);
        gantt = new Gantt(page);
        originalVisual = await gantt.visualSettings(cleanup);
        projectId = await project.addNew({ name: `Internal Gantt ${crypto.randomUUID()}` });
        const stack = await new BoardView(page).addColumn("Timeline");
        parent = await gantt.seedTask(projectId, stack, "A parent");
        child = await gantt.seedTask(projectId, stack, "Child", parent);
        await page.reload();
        await project.enableAllViews();
        await project.switchView("gantt");
        await project.goto(`/app/project/${projectId}`);
    });
    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
                console.error("Gantt cleanup:", String(error));
            }
        };
        if (changedVisual) await attempt(() => gantt.setVisualSettings(cleanup, originalVisual));
        if (projectId) {
            await attempt(() => gantt.cleanupOwned(cleanup, projectId, [child, parent]));
        }
        if (cleanup) await attempt(() => cleanup.dispose());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "Gantt cleanup failed");
    });
    test.beforeEach(({ attachVideoContext }) => attachVideoContext(context));
    test("schedules, moves and resizes dates with reload persistence and failure recovery", async () => {
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
            if (message.type() === "error" && message.text().includes("ResizeObserver loop")) {
                errors.push(message.text());
            }
        });
        changedVisual = true;
        await gantt.setVisualSettings(cleanup, { darkMode: false, embeddedTask: false });
        await gantt.reload();
        const today = new Date();
        const day = (offset: number) => format(addDays(today, offset), "yyyy-MM-dd");
        await gantt.hierarchy(parent, child);
        await gantt.scalesAndPane();
        await gantt.scheduleByPointer(child);
        await gantt.expectDates(child, day(0), day(2));
        await gantt.editDates(parent, day(0), day(4));
        await gantt.expectDates(parent, day(0), day(4));
        await gantt.expectParentConnection(parent, child);
        await gantt.editDates(parent, day(90), day(94));
        await gantt.reveal(parent);
        await gantt.expectDates(parent, day(90), day(94));
        await gantt.editDates(parent, day(0), day(4));
        await gantt.reveal(parent);
        await gantt.reload();
        await gantt.expectDates(parent, day(0), day(4));
        await gantt.drag(parent, 2);
        await gantt.expectDates(parent, day(2), day(6));
        await gantt.drag(parent, 1, "left");
        await gantt.expectDates(parent, day(3), day(6));
        await gantt.drag(parent, 1, "right");
        await gantt.expectDates(parent, day(3), day(7));
        await gantt.expectTaskNavigation(parent);
        await gantt.backToChart();
        await gantt.drag(parent, -2, "move", true);
        await gantt.expectDates(parent, day(3), day(7));
        await gantt.reload();
        await gantt.expectDates(parent, day(3), day(7));
        await page.route(`**/api/tasks/${parent}`, route =>
            route.request().method() === "PATCH"
                ? route.fulfill({
                      status: 500,
                      contentType: "application/json",
                      body: JSON.stringify({ error: "Gantt test rejection" }),
                  })
                : route.continue()
        );
        await gantt.editDates(parent, day(1), day(2), false);
        await gantt.expectDates(parent, day(3), day(7));
        await page.unroute(`**/api/tasks/${parent}`);
        await gantt.reload();
        await gantt.expectDates(parent, day(3), day(7));
        await gantt.screenshot("results/gantt-desktop.png");
        await gantt.setVisualSettings(cleanup, { darkMode: true });
        await gantt.reload();
        await gantt.screenshot("results/gantt-dark.png");
        await gantt.narrowScreenshot("results/gantt-narrow.png");
        await gantt.editDates(child, day(0), day(0));
        await gantt.reload();
        await gantt.expectBarOpensWithoutSaving(child, "day");
        await gantt.expectBarOpensWithoutSaving(child, "halfYear");
        await gantt.expectBoundedRendering(projectId, parent);
        await gantt.setVisualSettings(cleanup, { embeddedTask: true });
        await gantt.reload();
        await gantt.expectTaskNavigation(parent);
        expect(errors).toEqual([]);
    });
});
