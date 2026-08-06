import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";

test.describe("Project - Settings", () => {
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
        projectName = `Project settings ${Math.floor(Math.random() * 10000)}`;
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

    test("Should update project settings and persist project fields", async () => {
        const description = `Updated project description ${Date.now()}`;
        const backgroundUrl = "https://example.com/project-background.png";

        await project.openSettings();
        await project.settings.setDescription(description);
        await expect(project.settings.descriptionInput).toHaveValue(description);

        await project.settings.setDefaultFilter("all");
        await expect(project.settings.defaultFilterSelect).toHaveValue("all");

        const showSubtasksInput = project.settings.showSubtasksInput;
        const wasChecked = await showSubtasksInput.isChecked();
        await project.settings.toggleShowSubtasks();
        await expect(showSubtasksInput).toBeChecked({ checked: !wasChecked });

        await project.settings.setBackgroundUrl(backgroundUrl);
        await expect(project.settings.backgroundUrlInput).toHaveValue(backgroundUrl);

        await project.settings.openTab("time");
        await project.settings.openTab("fields");
        await project.settings.close();

        await project.openSettings();
        await expect(project.settings.descriptionInput).toHaveValue(description);
        await project.settings.openTab("interface");
        await expect(project.settings.backgroundUrlInput).toHaveValue(backgroundUrl);
        await project.settings.close();
    });
});
