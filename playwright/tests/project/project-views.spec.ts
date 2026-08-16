import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project, { PROJECT_VIEW_IDS } from "../../pages/project";

test.describe("Project - Views", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let projectName: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        projectName = `Project views ${Date.now()}`;
        await project.addNew({ name: projectName });
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) {
            await project.delete(projectName);
            await page.close();
        }

        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("Should enable and show all nine project views", async () => {
        await project.enableAllViews();
        await project.expectAllViewsVisible();
    });

    test("Should render every project view", async () => {
        for (const view of PROJECT_VIEW_IDS) {
            await project.switchView(view);
        }
    });

    test("Should show empty states for data-backed views", async () => {
        await project.expectEmptyView("attachments");
        await project.expectEmptyView("links");
        await project.expectEmptyView("gantt");
    });

    test("Should persist project notes", async () => {
        await project.setNotesAndExpectPersistence(`Project notes ${Date.now()}`);
    });
});
