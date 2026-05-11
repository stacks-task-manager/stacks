import type { Browser, BrowserContext, Page } from "@playwright/test";
import { addDays, format, subDays } from "date-fns";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";
import BoardView from "../../pages/boardView";
import Preferences from "../../pages/preferences";
import TaskDetails from "../../pages/taskDetails";

const TEST_PROJECT = "Task details";
const MAIN_COLUMN = "Column 1";
const TASK_TITLE = "Task 1";
const TASK_DESCRIPTION =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

test.describe("Project - Task details", () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let project: Project;
    let sidebar: Sidebar;
    let board: BoardView;
    let projectName: string;
    let preferences: Preferences;
    let taskDetails: TaskDetails;

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);
        board = new BoardView(page);
        preferences = new Preferences(page);
        taskDetails = new TaskDetails(page);

        projectName = `${TEST_PROJECT} ${Math.floor(Math.random() * 10000)}`;

        const projectId = await project.addNew({ name: projectName });
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
        const count = await matchingProjects.count();
        expect(count).toBeGreaterThanOrEqual(1);
        await expect(page).toHaveURL(`/app#/project/${projectId}`);

        await board.addColumn(MAIN_COLUMN);
        await project.addTask({
            project: projectName,
            column: MAIN_COLUMN,
            task: {
                title: TASK_TITLE,
                description: TASK_DESCRIPTION,
            },
        });
        await board.openCard(TASK_TITLE);
    });

    test.beforeEach(async ({ attachVideoContext }: any) => {
        attachVideoContext(context);
    });

    test.afterAll(async () => {
        await taskDetails.close();
        await expect(taskDetails.task).toBeHidden();

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

    test("Should change the title", async () => {
        const TASK_TITLE_UPDATED = "Task 1 updated";
        await test.step("Should update the title in the task details", async () => {
            const initialTitle = await taskDetails.getTitle();
            await taskDetails.setTitle(TASK_TITLE_UPDATED);
            const newTitle = await taskDetails.getTitle();
            await expect(newTitle).not.toEqual(initialTitle);
            await expect(newTitle).toEqual(TASK_TITLE_UPDATED);
        });

        await test.step("Should update the title", async () => {
            const card = board.getCardByName(TASK_TITLE_UPDATED);
            await expect(card).toBeVisible();
        });
    });

    test("Should change the description of the task", async () => {
        const initialDescription = await taskDetails.getDescription();
        await taskDetails.setDescription("New description");
        const newDescription = await taskDetails.getDescription();
        await expect(newDescription).not.toEqual(initialDescription);
        await expect(newDescription).toEqual("New description");
    });

    test("Should assign and unassign people", async () => {
        const users = ["Admin User"];

        await test.step("Should assign people", async () => {
            await taskDetails.toggleAssignees(users);
            const assignees = await taskDetails.getSelectedAssignees();
            await expect(assignees).toEqual(users);
        });

        await test.step("Should unassign people", async () => {
            await taskDetails.toggleAssignees(users);
            const assignees = await taskDetails.getSelectedAssignees();
            await expect(assignees).toEqual([]);
        });

        await test.step("Should unassign all people", async () => {
            await taskDetails.toggleAssignees(users);
            const assignees = await taskDetails.getSelectedAssignees();
            await expect(assignees).toEqual(users);

            await taskDetails.clearSelectedAssignees();
            const assigneesAfterClear = await taskDetails.getSelectedAssignees();
            await expect(assigneesAfterClear).toEqual([]);
        });
    });

    test("Should change the priority", async () => {
        for await (const priority of ["Critical", "High", "Medium", "Low"]) {
            await test.step(`Should set the priority to ${priority}`, async () => {
                await taskDetails.setPriority(priority);
                const priorityAfterSet = await taskDetails.getPriority();
                await expect(priorityAfterSet).toEqual(priority);
            });
        }

        await test.step("Should clear the priority with the `X` button", async () => {
            await taskDetails.setPriority("Critical");
            await taskDetails.clearPriority();
            const priorityAfterClear = await taskDetails.getPriority();
            await expect(priorityAfterClear).toEqual("Add priority");
        });
    });

    test("Should manage dates", async () => {
        const iterator = [
            {
                locator: taskDetails.dueDate,
                name: "due",
                setDate: (date: Date) => taskDetails.setDueDate(date),
                clearDate: () => taskDetails.clearDueDate(),
            },
            {
                locator: taskDetails.startDate,
                name: "start",
                setDate: (date: Date) => taskDetails.setStartDate(date),
                clearDate: () => taskDetails.clearStartDate(),
            },
        ];

        for (const date of iterator) {
            await test.step(`Should set the ${date.name} date`, async () => {
                const DATE_FORMAT = "MMM d, yyyy, h:mm a";
                await test.step("Should set the date today", async () => {
                    const today = new Date();
                    const dateString = format(today, DATE_FORMAT);

                    await date.setDate(today);
                    await expect(date.locator).toHaveText(dateString);
                    await expect(date.locator).toHaveClass(/intent-warning/);

                    await date.clearDate();
                    await expect(date.locator).toHaveText("Add date");
                });

                await test.step("Should set the date in the future", async () => {
                    const futureDate = addDays(new Date(), 10);
                    const dateString = format(futureDate, DATE_FORMAT);

                    await date.setDate(futureDate);
                    await expect(date.locator).toHaveText(dateString);
                    await expect(date.locator).toHaveClass(/intent-success/);

                    await date.clearDate();
                    await expect(date.locator).toHaveText("Add date");
                });

                await test.step("Should set the date in the past", async () => {
                    const pastDate = subDays(new Date(), 10);
                    const dateString = format(pastDate, DATE_FORMAT);

                    await date.setDate(pastDate);
                    await expect(date.locator).toHaveText(dateString);
                    await expect(date.locator).toHaveClass(/intent-danger/);

                    await date.clearDate();
                    await expect(date.locator).toHaveText("Add date");
                });
            });
        }
    });

    test("Should close and reopen task details from the board", async () => {
        const cardTitle = await taskDetails.getTitle();
        await taskDetails.close();
        await expect(taskDetails.drawer).toBeHidden();

        await board.openCard(cardTitle);
        await taskDetails.waitUntilOpen();
        await expect(taskDetails.body).toBeVisible();
        await expect(taskDetails.title).toBeVisible();
    });

    test("Should manage subtasks", async () => {
        await test.step("Should add a subtask from the header", async () => {
            await taskDetails.headerNewSubtaskButton.click();
            await expect(taskDetails.subtasks.input).toBeVisible();
            await taskDetails.subtasks.saveSubtask("Subtask 1");
        });
        await test.step.skip("Should check the task status counter", async () => {});
        await test.step.skip("Should add a subtask using hotkeys", async () => {});
        await test.step("Should add a subtask from the task details mid section", async () => {
            const countBefore = await taskDetails.subtasks.countSubtasks();
            await taskDetails.subtasks.addSubtask("Subtask from mid section");
            await expect(taskDetails.subtasks.subtaskRowByTitle("Subtask from mid section")).toBeVisible();
            const countAfter = await taskDetails.subtasks.countSubtasks();
            await expect(countAfter).toBe(countBefore + 1);
        });
        await test.step("Should toggle subtask completion from the list", async () => {
            const stateButton = taskDetails.subtasks.subtaskStateByTitle("Subtask 1");
            await stateButton.click();
            await expect(stateButton).toHaveClass(/active/);
            await stateButton.click();
            await expect(stateButton).not.toHaveClass(/active/);
        });
        await test.step.skip("Should add dates", async () => {});
        await test.step.skip("Should assign people", async () => {});
        await test.step.skip("Should check available menu", async () => {});
        await test.step.skip("Should edit inline", async () => {});
        await test.step.skip("Should edit inline while holding hotkey", async () => {});
        await test.step.skip("Should open a subtask", async () => {});
        await test.step.skip("Should return to parent task", async () => {});
        await test.step.skip("Should add subtask dependencies", async () => {});
        await test.step.skip("Should detach from parent", async () => {});
        await test.step.skip("Should delete subtask", async () => {});
    });

    /*
        - header
            - running a timer
            - adding a notification
            - logging time
            - jumping to the previous and next tasks
            - add a subtask
            - context menu
            - toggle fullscreen
            - close the drawer
        
        - setting status
        - setting dates
            - start
            - due
            - do
        - set task repeats
        - setting tags
        - setting estimates
        - checking whether the time spent tag counts the correct time

        - adding subtasks
            - navigating between subtasks and parten
            - adding assignees and dates
            - adding subtasks using hotkey

        - tabs
            - files
            - dependencies
            - time entries
            - links
            - locations

        - commenting
            - adding comments
            - deleting comments
            - editing a comment

        - editing the layot of the task details

        - marking a task as done and to do
        - archiving a task
    */
});
