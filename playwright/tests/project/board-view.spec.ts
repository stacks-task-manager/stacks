import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";
import BoardView from "../../pages/boardView";
import Preferences from "../../pages/preferences";
import { hexToRgb } from "../../utils";

const TEST_PROJECT = "Board view project";

test.describe("Project - Board view", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let sidebar: Sidebar;
    let board: BoardView;
    let projectName: string;
    let preferences: Preferences;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);
        board = new BoardView(page);
        preferences = new Preferences(page);

        projectName = `${TEST_PROJECT} ${Math.floor(Math.random() * 10000)}`;
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        await project.delete(projectName);
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
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

    test("Board workflow", async () => {
        await test.step("Should create a project", async () => {
            const projectId = await project.addNew({ name: projectName });
            const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
            const count = await matchingProjects.count();
            expect(count).toBeGreaterThanOrEqual(1);
            await expect(page).toHaveURL(`/app/project/${projectId}`);
        });

        await test.step("Should add the first column via the blank slate", async () => {
            await expect(board.blankSlate).toBeVisible();
            await board.blankSlateAddButton.click();
            await expect(page.getByTestId("popup-new-generic-input")).toBeVisible();
            await page.getByTestId("popup-new-generic-input").fill("Column 1");
            await page.getByTestId("popup-new-generic-button").click();
            await expect(board.blankSlate).toBeHidden();
            await expect(page.getByTestId("popup-new-generic-input")).toBeHidden();
            await expect(board.blankSlate).toBeHidden();

            // check if the counter is 0
            const counter = board.getColumnByName("Column 1").getByTestId("columns-task-counter");
            await expect(counter).toHaveText("0");
            counter.hover();
            await board.tooltip.waitFor({ state: "visible" });
            await expect(board.tooltip).toHaveText("0 completed out of 0");
        });

        await test.step("Should add the next columns via the `Add new column` button", async () => {
            for (let i = 2; i < 4; i++) {
                await expect(board.addNewColumnButton).toBeVisible();
                await board.addNewColumnButton.click();
                await expect(page.getByTestId("popup-new-generic-input")).toBeVisible();
                await page.getByTestId("popup-new-generic-input").fill(`Column ${i}`);
                await page.getByTestId("popup-new-generic-button").click();
                await expect(page.getByTestId("popup-new-generic-input")).toBeHidden();
            }

            // check if there are 3 columns
            await expect(board.columns).toHaveCount(3);
        });
    });
});
