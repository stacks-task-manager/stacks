import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";

test.describe("Project - Settings", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let projectName: string;
    let projectId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        projectName = `Project settings ${Math.floor(Math.random() * 10000)}`;
        projectId = await project.addNew({ name: projectName });
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
