import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";

test.describe("Project", () => {
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
        projectName = `Project toolbar ${Math.floor(Math.random() * 10000)}`;
        projectId = await project.addNew({ name: projectName });
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        try {
            if (page && !page.isClosed() && projectId) {
                await project.deleteById(projectId);
            }
        } finally {
            if (page && !page.isClosed()) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();
        }
    });

    test("Should expose toolbar controls and project menu actions", async () => {
        await expect(project.toolbar).toBeVisible();
        await expect(project.infoButton).toBeVisible();
        await expect(project.favoriteButton).toHaveAttribute("data-active", "false");

        await project.infoButton.click();
        await expect(project.infoContent).toBeVisible();
        await project.closeInfo();

        await project.openMenu();
        await expect(project.menuItem("project-menu-settings")).toBeVisible();
        await expect(project.menuItem("project-menu-automations")).toBeVisible();
        await expect(project.menuItem("project-menu-tags-statuses")).toBeVisible();
        await project.closeMenu();

        await project.favoriteButton.click();
        await expect(project.favoriteButton).toHaveAttribute("data-active", "true");
        await project.favoriteButton.click();
        await expect(project.favoriteButton).toHaveAttribute("data-active", "false");
    });

    test("Should switch between enabled project views", async () => {
        await project.enableAllViews();
        await project.expectAllViewsVisible();

        await project.switchView("list");
        await project.switchView("overview");
        await project.switchView("notes");
        await project.switchView("board");
    });

    test("Should export the project overview as PDF", async () => {
        const result = await project.exportPdf();

        expect(result.status).toBe(200);
        expect(result.contentType).toContain("application/pdf");
        expect(result.contentDisposition).toMatch(/attachment;.*\.pdf/i);
        expect(result.requestBody).toMatchObject({ type: "project", format: "pdf" });
        expect(result.body.subarray(0, 4).toString()).toBe("%PDF");
        expect(result.body.length).toBeGreaterThan(4);
    });

    test("Should update the project title", async () => {
        const title = `Renamed project ${Date.now()}`;
        await project.rename(title);
        await expect(project.title).toHaveText(title);
        projectName = title;
    });

    test("Should update project settings and show the expiration bell", async () => {
        await project.openSettings();
        await project.settings.setEndDateSoon();
        await project.settings.close();

        await expect(project.expirationButton).toBeVisible();
    });

    test("Should reload the project", async () => {
        await project.reload();
    });
});
