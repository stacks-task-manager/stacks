import type { Browser, BrowserContext, Page } from "@playwright/test";
import { test } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project, { PROJECT_VIEW_IDS } from "../../pages/project";
import { TASKDETAILMATRIX } from "@stacks/types";
import BoardView from "../../pages/boardView";
import TaskDetails from "../../pages/taskDetails";
import Preferences from "../../pages/preferences";
import { closeDb, getDb } from "../../fixtures/db";

test.describe("Project - Views", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let projectName: string;
    let projectId: string;
    const ownedProjects: string[] = [];
    let originalMatrix: string[];
    let matrixOverridden = false;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        projectName = `Project views ${Date.now()}`;
        projectId = await project.addNew({ name: projectName });
        ownedProjects.push(projectId);
    });

    test.beforeEach(({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        const errors: unknown[] = [];
        const attempt = async (action: () => Promise<unknown>) => {
            try {
                await action();
            } catch (error) {
                errors.push(error);
            }
        };
        if (matrixOverridden && page && !page.isClosed())
            await attempt(() => new Preferences(page).setTaskDetailsMatrix(originalMatrix));
        for (const id of ownedProjects) {
            await attempt(() => getDb().cleanupProjectTaskRecords(id));
            if (page && !page.isClosed()) await attempt(() => project.deleteById(id));
        }
        await attempt(closeDb);
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "Project views cleanup failed");
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

    test("Should aggregate task estimates and progress only within the selected project after reload", async () => {
        const board = new BoardView(page);
        const details = new TaskDetails(page);
        const preferences = new Preferences(page);
        originalMatrix = await preferences.getTaskDetailsMatrix();
        if (!originalMatrix.includes(TASKDETAILMATRIX.PROGRESS)) {
            matrixOverridden = true;
            await preferences.setTaskDetailsMatrix([...originalMatrix, TASKDETAILMATRIX.PROGRESS]);
        }
        await project.goto(`/app/project/${projectId}`);
        await project.enableAllViews();
        await project.switchView("board");
        const stackId = await board.addColumn("Overview totals");
        const firstTitle = `Overview first ${crypto.randomUUID()}`;
        const secondTitle = `Overview second ${crypto.randomUUID()}`;
        await board.addTaskToStack(stackId, firstTitle);
        const firstId = await board.getCardIdByName(firstTitle);
        await board.addTaskToStack(stackId, secondTitle);
        const secondId = await board.getCardIdByName(secondTitle);

        const excludedId = await project.addNew({ name: `Excluded overview ${crypto.randomUUID()}` });
        ownedProjects.push(excludedId);
        const excludedStack = await board.addColumn("Excluded totals");
        const excludedTitle = `Excluded task ${crypto.randomUUID()}`;
        await board.addTaskToStack(excludedStack, excludedTitle);
        await details.openProjectTask(excludedId, await board.getCardIdByName(excludedTitle));
        await details.setEstimate("7h");
        await details.selectProgress(20);

        await details.openProjectTask(projectId, firstId);
        await details.setEstimate("1h");
        await details.selectProgress(60);
        await details.openProjectTask(projectId, secondId);
        await details.setEstimate("2h");
        await details.close();
        await project.switchView("overview");
        await project.expectOverviewAfterReload(
            projectId,
            {
                tasksTotal: 2,
                tasksIdle: 1,
                tasksInProgress: 1,
                tasksCompleted: 0,
                timeEstimatedTotal: 10800,
            },
            "3h"
        );

        await details.openProjectTask(projectId, firstId);
        await details.setEstimate("30m");
        await details.selectProgress(0);
        await details.close();
        await project.switchView("overview");
        await project.expectOverviewAfterReload(
            projectId,
            {
                tasksTotal: 2,
                tasksIdle: 2,
                tasksInProgress: 0,
                tasksCompleted: 0,
                timeEstimatedTotal: 9000,
            },
            "2h 30m"
        );

        await details.openProjectTask(projectId, secondId);
        await details.toggleDoneFromMenu();
        await details.expectPersistedDone(secondId, true);
        await project.goto(`/app/project/${projectId}`);
        await project.switchView("overview");
        await project.expectOverviewAfterReload(
            projectId,
            {
                tasksTotal: 2,
                tasksIdle: 1,
                tasksInProgress: 0,
                tasksCompleted: 1,
                timeEstimatedTotal: 9000,
            },
            "2h 30m"
        );
    });
});
