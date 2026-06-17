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

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);

        // creating a base test project
        const projectId = await project.addNew({ name: TEST_PROJECT });
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: TEST_PROJECT });
        await expect(matchingProjects).toHaveCount(1);
        await expect(page).toHaveURL(`/app/project/${projectId}`);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        await project.delete(TEST_PROJECT);
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: TEST_PROJECT });
        await expect(matchingProjects).toHaveCount(0);
        await expect(page.getByRole("alert")).toHaveText("Record deleted successfully");

        if (page && !page.isClosed()) {
            await page.close();
        }

        if (context) {
            await context.close();
        }

        if (browser) {
            await browser.close();
        }
    });
});
