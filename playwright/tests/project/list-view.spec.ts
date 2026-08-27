import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";

const TEST_PROJECT = "List view project";

test.describe("Project - List view", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let sidebar: Sidebar;
    let projectId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);

        // creating a base test project
        projectId = await project.addNew({ name: TEST_PROJECT });
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: TEST_PROJECT });
        await expect(matchingProjects).toHaveCount(1);
        await project.expectProjectUrl(projectId);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        try {
            if (page && !page.isClosed() && projectId) await project.deleteById(projectId);
        } finally {
            if (page && !page.isClosed()) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();
        }
    });

    test("Should render the list view", async () => {
        await project.switchView("list");
    });
});
