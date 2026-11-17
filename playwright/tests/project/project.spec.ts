import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import TasksTable from "../../pages/tasksTable";

test.describe("Project", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let tasksTable: TasksTable;
    let projectName: string;
    let projectId: string;
    let completedTaskId: string;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        tasksTable = new TasksTable(page);
        projectName = `Project toolbar ${Math.floor(Math.random() * 10000)}`;
        projectId = await project.addNew({ name: projectName });

        // A completed task so the "Archive completed tasks" menu action has something to do.
        const stackId = await tasksTable.createStackViaApi({ projectId, title: "P" });
        completedTaskId = await tasksTable.createTaskViaApi({ projectId, stackId, title: "P done" });
        await tasksTable.setTaskDoneViaApi(completedTaskId, true);
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

    test("Should open the task filter drawer and expose the filter fields", async () => {
        await project.openFilterDrawer();
        await expect(project.filterQueryInput).toBeVisible();

        // The do-date filter field is present as its trigger button (the menu items are `do-date-filter-*`).
        await expect(project.doDateFilterButton).toBeVisible();

        await project.closeFilterDrawer();
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

    test("Should export the project as XLSX and JSON", async () => {
        const xlsx = await project.exportProject("xlsx");
        project.expectExportResult(xlsx, "xlsx", "project");
        expect(xlsx.body.length).toBeGreaterThan(0);

        const json = await project.exportProject("json");
        project.expectExportResult(json, "json", "project");
        const payload = JSON.parse(json.body.toString("utf-8"));
        expect(payload.project.id).toBe(projectId);
    });

    test("Should archive completed tasks from the project menu", async () => {
        await project.archiveCompleted();
        const archived = await tasksTable.filteredTaskIds({ archived: "true", project: projectId });
        expect(archived).toContain(completedTaskId);
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
