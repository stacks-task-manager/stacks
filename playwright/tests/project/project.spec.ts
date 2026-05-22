import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";

test.describe("Project", () => {
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
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
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

    /*
        - Toolbar tests
            - bell icon
            - menues
            - info icon
            - star icon
            - switches over to various views
            - project reloading
            - title change

        5. Project settings
    */
});
