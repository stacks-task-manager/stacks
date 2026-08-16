import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";

test.describe("Project - Menu", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let sidebar: Sidebar;
    let projectName: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);
        projectName = `Project menu ${Math.floor(Math.random() * 10000)}`;
        await project.addNew({ name: projectName });
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        if (page && !page.isClosed()) {
            const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
            if ((await matchingProjects.count()) > 0) {
                await project.delete(projectName);
            }
            await expect(matchingProjects).toHaveCount(0);
        }

        if (page && !page.isClosed()) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test("Should expose project menu actions and open non-destructive dialogs", async () => {
        await project.openMenu();
        await expect(project.menuItem("project-menu-settings")).toBeVisible();
        await expect(project.menuItem("project-menu-automations")).toBeVisible();
        await expect(project.menuItem("project-menu-tags-statuses")).toBeVisible();
        await expect(project.menuItem("project-menu-duplicate")).toBeVisible();
        await expect(project.menuItem("project-menu-bookmark")).toBeVisible();
        await expect(project.menuItem("project-menu-share-link")).toBeVisible();
        await expect(project.menuItem("project-menu-privacy")).toBeVisible();
        await expect(project.menuItem("project-menu-archives")).toBeVisible();
        await project.openArchivesMenu();
        await expect(project.menuItem("project-menu-show-archived")).toBeVisible();
        await expect(project.menuItem("delete-project-button")).toBeVisible();

        await project.menuItem("project-menu-settings").click();
        await expect(project.settings.dialog).toBeVisible();
        await project.settings.close();

        await project.openMenu();
        await project.openArchivesMenu();
        await project.menuItem("project-menu-show-archived").click();
        await expect(project.dialog).toBeVisible();
        await project.closeMenu();
    });
});
