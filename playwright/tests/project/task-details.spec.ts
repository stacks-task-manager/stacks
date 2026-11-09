import type { Browser, BrowserContext, Page } from "@playwright/test";
import { TASKDETAILMATRIX } from "@stacks/types";
import { randomUUID } from "node:crypto";
import { addDays, format, parse, subDays } from "date-fns";
import { test, expect } from "../../fixtures";
import { bootstrapContext } from "../../fixtures/bootstrapContext";
import Project from "../../pages/project";
import Sidebar from "../../pages/sidebar";
import BoardView from "../../pages/boardView";
import Preferences from "../../pages/preferences";
import TaskDetails from "../../pages/taskDetails";
import TasksTable from "../../pages/tasksTable";
import { TaskTimeLogs } from "../../pages/components/TaskTimeLogs";
import { TaskTimer } from "../../pages/components/TaskTimer";
import { TaskArchives } from "../../pages/components/TaskArchives";
import Auth from "../../pages/auth";
import { closeDb, getDb } from "../../fixtures/db";
import { e2eBaseUrl } from "../../config/runtime";

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
    let projectId: string;
    let mainStackId: string;
    let baseTaskId: string;
    let originalTaskDetailsPreferences: Record<string, boolean> = {};
    let preferences: Preferences;
    let taskDetails: TaskDetails;
    const ownedTagIds: string[] = [];
    let statusTagIds: { tagId: string; otherTagId: string; statusId: string; otherStatusId: string };

    test.beforeAll(async ({ login: loginPage }: any) => {
        ({ browser, context, page } = await bootstrapContext());
        await loginPage({ page });

        project = new Project(page);
        sidebar = new Sidebar(page);
        board = new BoardView(page);
        preferences = new Preferences(page);
        taskDetails = new TaskDetails(page);

        const taskDetailsSettings = [
            "Show attachments",
            "Show subtasks",
            "Show dependencies",
            "Show locations",
            "Show links",
            "Show time entries",
        ];
        await preferences.openTab("Task details");
        for (const setting of taskDetailsSettings) {
            originalTaskDetailsPreferences[setting] = await preferences
                .getPreferenceControl(setting)
                .isChecked();
        }
        await preferences.closePreferences();

        projectName = `${TEST_PROJECT} ${randomUUID()}`;

        projectId = await project.addNew({ name: projectName });
        const matchingProjects = sidebar.documentsTreeItems.filter({ hasText: projectName });
        const count = await matchingProjects.count();
        expect(count).toBeGreaterThanOrEqual(1);
        await project.expectProjectUrl(projectId);

        mainStackId = await board.addColumn(MAIN_COLUMN);
        await project.addTask({
            project: projectName,
            column: MAIN_COLUMN,
            task: {
                title: TASK_TITLE,
                description: TASK_DESCRIPTION,
            },
        });
        baseTaskId = await board.getCardIdByName(TASK_TITLE);
        const tasksTable = new TasksTable(page);
        const createOwnedTag = async (type: "tag" | "status") => {
            const id = await tasksTable.findOrCreateTagViaApi({
                title: `E02 ${type} ${randomUUID()}`,
                type,
            });
            ownedTagIds.push(id);
            return id;
        };
        statusTagIds = {
            tagId: await createOwnedTag("tag"),
            otherTagId: await createOwnedTag("tag"),
            statusId: await createOwnedTag("status"),
            otherStatusId: await createOwnedTag("status"),
        };
        await preferences.toggleSetting("Task details", "Show attachments", true);
        await preferences.toggleSetting("Task details", "Show subtasks", true);
        await preferences.toggleSetting("Task details", "Show dependencies", true);
        await preferences.toggleSetting("Task details", "Show locations", true);
        await preferences.toggleSetting("Task details", "Show links", true);
        await preferences.toggleSetting("Task details", "Show time entries", true);
        await page.reload();
        await board.openCard(TASK_TITLE);
    });

    test.beforeEach(async ({ attachVideoContext }: any) => {
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
        if (projectId) await attempt(() => getDb().cleanupProjectTaskRecords(projectId));
        for (const id of ownedTagIds) await attempt(() => getDb().cleanupTag(id));
        if (page && !page.isClosed() && projectId) await attempt(() => project.deleteById(projectId));
        if (page && !page.isClosed()) {
            for (const [setting, checked] of Object.entries(originalTaskDetailsPreferences)) {
                await attempt(() => preferences.setSwitch("Task details", setting, checked));
            }
            await attempt(() => preferences.closePreferences());
        }
        await attempt(closeDb);
        if (page && !page.isClosed()) await attempt(() => page.close());
        if (context) await attempt(() => context.close());
        if (browser) await attempt(() => browser.close());
        if (errors.length) throw new AggregateError(errors, "Task details fixture cleanup failed");
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

    test("Should expose header fullscreen, tabs, and task menu actions", async () => {
        await taskDetails.toggleFullscreen();
        await expect(taskDetails.drawer).toHaveClass(/fullscreen/);
        await taskDetails.toggleFullscreen();
        await expect(taskDetails.drawer).not.toHaveClass(/fullscreen/);

        if ((await taskDetails.tabs.count()) > 0) {
            await expect(taskDetails.tabs).toBeVisible();
            await expect(taskDetails.tab("Files")).toBeVisible();
            await expect(taskDetails.tab("Dependencies")).toBeVisible();
            await expect(taskDetails.tab("Time entries")).toBeVisible();
            await expect(taskDetails.tab("Links")).toBeVisible();
            await expect(taskDetails.tab("Locations")).toBeVisible();
        }

        await taskDetails.openMenu();
        await expect(taskDetails.menuItem("task-details-menu-toggle-complete")).toBeVisible();
        await expect(taskDetails.menuItem("task-details-menu-bookmark")).toBeVisible();
        await expect(taskDetails.menuItem("task-details-menu-share-link")).toBeVisible();
        await expect(taskDetails.menuItem("task-details-menu-copy-move")).toBeVisible();
        await expect(taskDetails.menuItem("task-details-menu-attach-parent")).toBeVisible();
        await expect(taskDetails.menuItem("task-details-menu-privacy")).toBeVisible();
        await expect(taskDetails.menuItem("task-details-menu-archive")).toBeVisible();
        await expect(taskDetails.menuItem("task-details-menu-delete")).toBeVisible();
        await taskDetails.closeMenu();
    });

    test("Should add, reload, and remove task dependencies", async () => {
        const dependencyTitle = `Dependency target ${randomUUID()}`;
        const isolatedStackTitle = `Dependency isolated column ${randomUUID()}`;
        const isolatedTaskTitle = `Dependency isolated item ${randomUUID()}`;
        await taskDetails.close();
        const isolatedStackId = await board.addColumn(isolatedStackTitle);
        await board.addTaskToStack(isolatedStackId, isolatedTaskTitle);
        await board.addTaskToStack(mainStackId, dependencyTitle);
        const dependencyTaskId = await board.getCardIdByName(dependencyTitle);
        const isolatedTaskId = await board.getCardIdByName(isolatedTaskTitle);
        await board.openCard(TASK_TITLE);
        const parentTaskId = await taskDetails.getTaskId();
        const previousStorage = await taskDetails.captureDependencyPickerStorage(parentTaskId);

        try {
            await taskDetails.openDependenciesDialog();
            await taskDetails.selectDependencyProject(projectId, projectName);
            await taskDetails.selectDependencyStack(mainStackId);
            await taskDetails.expectDependencyTaskDisabled(parentTaskId);
            await taskDetails.expectDependencyTaskVisible(dependencyTaskId);
            await taskDetails.expectDependencyTaskHidden(isolatedTaskId);
            await taskDetails.selectDependencyStack(isolatedStackId);
            await taskDetails.expectDependencyTaskVisible(isolatedTaskId);
            await taskDetails.expectDependencyTaskHidden(dependencyTaskId);
            await taskDetails.selectDependencyStack(mainStackId);
            await taskDetails.setDependencySelection(projectName, mainStackId, dependencyTaskId, true);
            await taskDetails.saveDependencySelection(parentTaskId, [dependencyTaskId]);

            await taskDetails.reloadAndWaitForTaskData();
            await taskDetails.openDependenciesDialog();
            await taskDetails.expectDependencySelection(dependencyTaskId, true);
            await taskDetails.setDependencySelection(projectName, mainStackId, dependencyTaskId, false);
            await taskDetails.closeDependenciesDialog();
            await taskDetails.expectDependenciesPersisted(parentTaskId, [dependencyTaskId]);

            await taskDetails.openDependenciesDialog();
            await taskDetails.expectDependencySelection(dependencyTaskId, true);
            await taskDetails.setDependencySelection(projectName, mainStackId, dependencyTaskId, false);
            await taskDetails.saveDependencySelection(parentTaskId, []);
            await taskDetails.expectDependencyEmptyState();

            await taskDetails.reloadAndWaitForTaskData();
            await taskDetails.expectDependenciesPersisted(parentTaskId, []);
        } finally {
            await taskDetails.restoreDependencyPickerStorage(parentTaskId, previousStorage);
        }
    });

    test("Should persist task estimate and progress", async () => {
        const taskId = await taskDetails.getTaskId();
        const originalMatrix = await preferences.getTaskDetailsMatrix();
        const needsProgressOverride = !originalMatrix.includes(TASKDETAILMATRIX.PROGRESS);

        try {
            if (needsProgressOverride) {
                await preferences.setTaskDetailsMatrix([...originalMatrix, TASKDETAILMATRIX.PROGRESS]);
                await taskDetails.openProjectTask(projectId, taskId);
            }

            await test.step("Set, reload, and clear the estimate", async () => {
                await taskDetails.setEstimate("2h 30m");
                await taskDetails.reload();
                await taskDetails.expectEstimate("2h 30m");
                await taskDetails.expectEstimatePersisted(taskId, 9000);

                await taskDetails.enterInvalidEstimate("not a duration");
                await taskDetails.expectEstimatePersisted(taskId, 9000);

                await taskDetails.clearEstimate();
                await taskDetails.reload();
                await taskDetails.expectEstimate();
                await taskDetails.expectEstimatePersisted(taskId, null);
            });

            await test.step("Set and reload progress values", async () => {
                await taskDetails.selectProgress(60);
                await taskDetails.reload();
                await taskDetails.expectProgressPersisted(taskId, 60);

                await taskDetails.selectProgress(0);
                await taskDetails.reload();
                await taskDetails.expectProgressPersisted(taskId, 0);
            });
        } finally {
            if (needsProgressOverride) await preferences.setTaskDetailsMatrix(originalMatrix);
        }
    });

    test("Should persist task status and tags", async () => {
        const statusEmail = `e02-status-tags-${randomUUID()}@example.com`;
        const statusPassword = "E02StatusTags123!";
        let statusRoleTitle: string | undefined;
        let statusUserCreated = false;
        let statusContext: BrowserContext | undefined;
        let statusPage: Page | undefined;
        let statusProjectId: string | undefined;
        let statusTaskId: string | undefined;
        const originalMatrix: string[] = [];
        const requiredSections = [TASKDETAILMATRIX.STATUS, TASKDETAILMATRIX.TAGS];
        let needsMatrixOverride = false;

        try {
            statusRoleTitle = await getDb().createActiveUserWithAccess(statusEmail, statusPassword, {
                people: { read: true },
                roles: { read: true },
                project_settings: { read: true },
            });
            statusUserCreated = true;
            statusContext = await browser.newContext({ baseURL: e2eBaseUrl });
            statusPage = await statusContext.newPage();
            await new Auth(statusPage).loginAndWaitForAuthenticatedRequest(statusEmail, statusPassword);

            const statusPreferences = new Preferences(statusPage);
            const statusBoard = new BoardView(statusPage);
            const statusDetails = new TaskDetails(statusPage);
            const statusTasks = new TasksTable(statusPage);
            const statusProject = new Project(statusPage);
            originalMatrix.push(...(await statusPreferences.getTaskDetailsMatrix()));
            needsMatrixOverride = requiredSections.some(section => !originalMatrix.includes(section));
            if (needsMatrixOverride) {
                await statusPreferences.setTaskDetailsMatrix([
                    ...originalMatrix,
                    ...requiredSections.filter(section => !originalMatrix.includes(section)),
                ]);
            }

            const ownedProjectId = await statusProject.addNew({ name: `E02 status tags ${randomUUID()}` });
            statusProjectId = ownedProjectId;
            await statusBoard.gotoProject(ownedProjectId);
            const statusStackId = await statusBoard.addColumn(`E02 status tags ${randomUUID()}`);
            const statusTaskTitle = `E02 status tags ${randomUUID()}`;
            await statusBoard.addTaskToStack(statusStackId, statusTaskTitle);
            statusTaskId = await statusBoard.getCardIdByName(statusTaskTitle);
            await statusDetails.openProjectTask(ownedProjectId, statusTaskId);
            await statusDetails.reloadAndWaitForRecords();

            await test.step("Set and change status, then verify task and filter results", async () => {
                await statusDetails.setStatus(statusTagIds.statusId);
                await statusDetails.expectStatusPersisted(statusTaskId!, statusTagIds.statusId);
                await statusDetails.reload();

                await statusDetails.setStatus(statusTagIds.otherStatusId);
                await statusDetails.reload();
                await statusDetails.expectStatusPersisted(statusTaskId!, statusTagIds.otherStatusId);
                expect(
                    await statusTasks.filteredTaskIds({
                        project: ownedProjectId,
                        status: statusTagIds.otherStatusId,
                    })
                ).toContain(statusTaskId);
                expect(
                    await statusTasks.filteredTaskIds({
                        project: ownedProjectId,
                        status: statusTagIds.statusId,
                    })
                ).not.toContain(statusTaskId);

                await statusDetails.clearStatus();
                expect(
                    await statusTasks.filteredTaskIds({
                        project: ownedProjectId,
                        status: statusTagIds.otherStatusId,
                    })
                ).not.toContain(statusTaskId);
            });

            await test.step("Add, remove, and verify tags after reload", async () => {
                await statusDetails.setTaskTag(statusTagIds.tagId, true);
                await statusDetails.setTaskTag(statusTagIds.otherTagId, true);
                await statusDetails.reload();
                await statusDetails.expectTaskTagsPersisted(statusTaskId!, [
                    statusTagIds.tagId,
                    statusTagIds.otherTagId,
                ]);
                await statusDetails.expectStatusPersisted(statusTaskId!, null);

                await statusDetails.setTaskTag(statusTagIds.tagId, false);
                expect(
                    await statusTasks.filteredTaskIds({
                        project: ownedProjectId,
                        tags: statusTagIds.otherTagId,
                    })
                ).toContain(statusTaskId);
                expect(
                    await statusTasks.filteredTaskIds({ project: ownedProjectId, tags: statusTagIds.tagId })
                ).not.toContain(statusTaskId);

                await statusDetails.setTaskTag(statusTagIds.otherTagId, false);
                await statusDetails.reload();
                await statusDetails.expectTaskTagsPersisted(statusTaskId!, []);
                expect(
                    await statusTasks.filteredTaskIds({
                        project: ownedProjectId,
                        tags: statusTagIds.otherTagId,
                    })
                ).not.toContain(statusTaskId);
            });
            await test.step("Verify the board card and the task list row after reload", async () => {
                await statusBoard.gotoProject(ownedProjectId);
                await statusBoard.expectCardVisible(statusTaskTitle);
                await statusTasks.openFilteredTasks({ project: ownedProjectId });
                await statusTasks.expectRowVisible(statusTaskId!);
            });
        } finally {
            const cleanupErrors: unknown[] = [];
            const attempt = async (action: () => Promise<unknown>) => {
                try {
                    await action();
                } catch (error) {
                    cleanupErrors.push(error);
                }
            };
            if (statusTaskId && statusPage && !statusPage.isClosed())
                await attempt(() => new TasksTable(statusPage!).deleteTaskViaApi(statusTaskId!));
            if (statusProjectId) await attempt(() => getDb().cleanupProjectTaskRecords(statusProjectId!));
            if (statusProjectId && statusPage && !statusPage.isClosed())
                await attempt(() => new Project(statusPage!).deleteById(statusProjectId!));
            if (statusContext) await attempt(() => statusContext!.close());
            if (statusUserCreated) await attempt(() => getDb().cleanupUser(statusEmail));
            if (statusRoleTitle) await attempt(() => getDb().cleanupRole(statusRoleTitle!));
            if (cleanupErrors.length)
                throw new AggregateError(cleanupErrors, "Status/tag scenario cleanup failed");
        }
    });

    test("Should complete and reopen a task in filtered views", async () => {
        const taskId = await taskDetails.getTaskId();
        const wasDone = await taskDetails.getPersistedDone(taskId);
        const tasksTable = new TasksTable(page);
        const openFilter = { project: projectId, open: "true" };
        const completedFilter = { project: projectId, completed: "true" };

        try {
            await taskDetails.openProjectTask(projectId, taskId);
            if (wasDone) {
                await taskDetails.toggleDoneFromMenu();
                await taskDetails.expectPersistedDone(taskId, false);
            }

            const initialOpenCount = (await tasksTable.filteredTaskIds(openFilter)).length;
            const initialCompletedCount = (await tasksTable.filteredTaskIds(completedFilter)).length;

            await taskDetails.toggleDoneFromMenu();
            await taskDetails.expectPersistedDone(taskId, true);
            expect(await tasksTable.filteredTaskIds(completedFilter)).toContain(taskId);
            await tasksTable.openFilteredTasks(completedFilter);
            await tasksTable.expectRowVisible(taskId);
            await tasksTable.expectRowCount(initialCompletedCount + 1);

            await tasksTable.openFilteredTasks(openFilter);
            await tasksTable.expectRowAbsent(taskId);
            await tasksTable.expectRowCount(initialOpenCount - 1);

            await taskDetails.openProjectTask(projectId, taskId);
            await taskDetails.toggleDoneFromMenu();
            await taskDetails.expectPersistedDone(taskId, false);

            await tasksTable.openFilteredTasks(completedFilter);
            await tasksTable.expectRowAbsent(taskId);
            await tasksTable.expectRowCount(initialCompletedCount);
            await tasksTable.openFilteredTasks(openFilter);
            await tasksTable.expectRowVisible(taskId);
            await tasksTable.expectRowCount(initialOpenCount);
        } finally {
            const currentDone = await taskDetails.getPersistedDone(taskId);
            if (currentDone !== wasDone) {
                await taskDetails.openProjectTask(projectId, taskId);
                await taskDetails.toggleDoneFromMenu();
                await taskDetails.expectPersistedDone(taskId, wasDone);
            }
            await taskDetails.openProjectTask(projectId, taskId);
        }
    });

    test("Should create, edit, and delete a manual time entry with persisted totals", async () => {
        const taskId = await taskDetails.getTaskId();
        const timeLogs = new TaskTimeLogs(page);
        const description = "E2E time entry " + randomUUID();
        const updatedDescription = description + " updated";
        let timeLogId: string | undefined;

        try {
            await taskDetails.openTimeEntries();
            expect(await timeLogs.load(taskId)).toEqual([]);
            await timeLogs.expectRequiredAndInvalidDuration();
            expect(await timeLogs.load(taskId)).toEqual([]);

            const created = await timeLogs.create(taskId, "1h", description);
            timeLogId = created.id;
            expect(created.duration).toBe(3600);
            expect(format(new Date(created.date), "yyyy-MM-dd")).toBe(
                format(parse(timeLogs.getLastInputDate(), "P", new Date()), "yyyy-MM-dd")
            );
            expect(await timeLogs.load(taskId)).toEqual([expect.objectContaining({ id: created.id })]);
            await timeLogs.expectTotal("1h");

            await taskDetails.reloadAndWaitForTaskData();
            await taskDetails.openTimeEntries();
            await timeLogs.expectTotal("1h");
            expect(await timeLogs.load(taskId)).toEqual([expect.objectContaining({ id: created.id })]);

            await timeLogs.update(created.id, "1h 30m", updatedDescription);
            expect(await timeLogs.load(taskId)).toEqual([
                expect.objectContaining({ id: created.id, duration: 5400, description: updatedDescription }),
            ]);
            await timeLogs.expectTotal("1h 30m");

            await taskDetails.reloadAndWaitForTaskData();
            await taskDetails.openTimeEntries();
            await timeLogs.expectTotal("1h 30m");
            await timeLogs.delete(created.id);
            timeLogId = undefined;
            expect(await timeLogs.load(taskId)).toEqual([]);

            await taskDetails.reloadAndWaitForTaskData();
            await taskDetails.openTimeEntries();
            await timeLogs.expectEmpty();
            expect(await timeLogs.load(taskId)).toEqual([]);
        } finally {
            if (timeLogId) await timeLogs.cleanup(timeLogId);
        }
    });

    test("Should aggregate entries for two tasks on separate dates in the project Time view", async () => {
        const timeLogs = new TaskTimeLogs(page);
        const tasksTable = new TasksTable(page);
        const secondTaskTitle = `E05 second task ${randomUUID()}`;
        const firstDescription = `E05 yesterday ${randomUUID()}`;
        const secondDescription = `E05 prior day ${randomUUID()}`;
        const yesterday = new Date();
        yesterday.setHours(12, 0, 0, 0);
        yesterday.setDate(yesterday.getDate() - 1);
        const priorDay = new Date(yesterday);
        priorDay.setDate(priorDay.getDate() - 1);
        let secondTaskId: string | undefined;
        let firstLogId: string | undefined;
        let secondLogId: string | undefined;

        try {
            await taskDetails.openProjectTask(projectId, baseTaskId);
            await taskDetails.openTimeEntries();
            expect(await timeLogs.load(baseTaskId)).toEqual([]);
            const firstLog = await timeLogs.create(baseTaskId, "1h", firstDescription, yesterday);
            firstLogId = firstLog.id;
            expect(format(new Date(firstLog.date), "yyyy-MM-dd")).toBe(format(yesterday, "yyyy-MM-dd"));

            await taskDetails.close();
            await board.addTaskToStack(mainStackId, secondTaskTitle);
            secondTaskId = await board.getCardIdByName(secondTaskTitle);
            await taskDetails.openProjectTask(projectId, secondTaskId);
            await taskDetails.openTimeEntries();
            const secondLog = await timeLogs.create(secondTaskId, "30m", secondDescription, priorDay);
            secondLogId = secondLog.id;
            expect(format(new Date(secondLog.date), "yyyy-MM-dd")).toBe(format(priorDay, "yyyy-MM-dd"));
            expect(await timeLogs.load(secondTaskId)).toEqual([
                expect.objectContaining({ id: secondLog.id }),
            ]);

            await taskDetails.close();
            await project.enableAllViews();
            await project.switchView("time");
            await timeLogs.expectProjectEntry(firstLog.id, firstDescription);
            await timeLogs.expectProjectEntry(secondLog.id, secondDescription);
            await timeLogs.expectProjectTotal("1h 30m");
        } finally {
            const cleanupErrors: unknown[] = [];
            for (const id of [firstLogId, secondLogId]) {
                if (!id) continue;
                try {
                    await timeLogs.cleanup(id);
                } catch (error) {
                    cleanupErrors.push(error);
                }
            }
            if (secondTaskId) {
                try {
                    await tasksTable.deleteTaskViaApi(secondTaskId);
                } catch (error) {
                    cleanupErrors.push(error);
                }
            }
            try {
                await taskDetails.openProjectTask(projectId, baseTaskId);
            } catch (error) {
                cleanupErrors.push(error);
            }
            try {
                await project.switchView("board");
            } catch (error) {
                cleanupErrors.push(error);
            }
            if (cleanupErrors.length) {
                const details = cleanupErrors
                    .map(error => (error instanceof Error ? error.message : String(error)))
                    .join("; ");
                throw new AggregateError(cleanupErrors, `Time view scenario cleanup failed: ${details}`);
            }
        }
    });

    test("Should keep month and week boundary entries on the correct dates in the project Time view", async () => {
        const timeLogs = new TaskTimeLogs(page);
        const tasksTable = new TasksTable(page);
        const boundaryTaskTitle = `E05 boundary task ${randomUUID()}`;
        const beforeDescription = `E05 boundary before ${randomUUID()}`;
        const afterDescription = `E05 boundary after ${randomUUID()}`;
        // 2026-05-31 is a Sunday that also ends May; 2026-06-01 is the Monday that starts the next
        // ISO week and the next month, so the pair crosses a midnight, month and week boundary.
        const boundaryBefore = new Date(2026, 4, 31);
        const boundaryAfter = new Date(2026, 5, 1);
        let boundaryTaskId: string | undefined;
        let beforeLogId: string | undefined;
        let afterLogId: string | undefined;

        try {
            const browserZone = await timeLogs.getBrowserZoneForDate(2026, 4, 31);
            expect(browserZone.timeZone !== "").toBe(true);
            expect(browserZone.offsetMinutes).toBe(boundaryBefore.getTimezoneOffset());

            expect(boundaryBefore.getMonth() !== boundaryAfter.getMonth()).toBe(true);
            expect(boundaryBefore.getDay()).toBe(0);
            expect(boundaryAfter.getDay()).toBe(1);

            await taskDetails.openProjectTask(projectId, baseTaskId);
            await taskDetails.openTimeEntries();
            expect(await timeLogs.load(baseTaskId)).toEqual([]);
            const beforeLog = await timeLogs.create(baseTaskId, "45m", beforeDescription, boundaryBefore);
            beforeLogId = beforeLog.id;
            expect(format(new Date(beforeLog.date), "yyyy-MM-dd")).toBe("2026-05-31");

            await taskDetails.close();
            await board.addTaskToStack(mainStackId, boundaryTaskTitle);
            boundaryTaskId = await board.getCardIdByName(boundaryTaskTitle);
            await taskDetails.openProjectTask(projectId, boundaryTaskId);
            await taskDetails.openTimeEntries();
            const afterLog = await timeLogs.create(boundaryTaskId, "15m", afterDescription, boundaryAfter);
            afterLogId = afterLog.id;
            expect(format(new Date(afterLog.date), "yyyy-MM-dd")).toBe("2026-06-01");

            await taskDetails.close();
            await project.enableAllViews();
            await project.switchView("time");
            await timeLogs.expectProjectEntry(beforeLog.id, beforeDescription);
            await timeLogs.expectProjectEntry(afterLog.id, afterDescription);
            await timeLogs.expectProjectEntryDate(beforeLog.id, format(boundaryBefore, "d"));
            await timeLogs.expectProjectEntryDate(afterLog.id, format(boundaryAfter, "d"));
            await timeLogs.expectProjectEntryOrder([afterLog.id, beforeLog.id]);
            await timeLogs.expectProjectTotal("1h");
        } finally {
            const cleanupErrors: unknown[] = [];
            for (const id of [beforeLogId, afterLogId]) {
                if (!id) continue;
                try {
                    await timeLogs.cleanup(id);
                } catch (error) {
                    cleanupErrors.push(error);
                }
            }
            if (boundaryTaskId) {
                try {
                    await tasksTable.deleteTaskViaApi(boundaryTaskId);
                } catch (error) {
                    cleanupErrors.push(error);
                }
            }
            try {
                await taskDetails.openProjectTask(projectId, baseTaskId);
            } catch (error) {
                cleanupErrors.push(error);
            }
            try {
                await project.switchView("board");
            } catch (error) {
                cleanupErrors.push(error);
            }
            if (cleanupErrors.length) {
                const details = cleanupErrors
                    .map(error => (error instanceof Error ? error.message : String(error)))
                    .join("; ");
                throw new AggregateError(cleanupErrors, `Boundary time entry cleanup failed: ${details}`);
            }
        }
    });

    test("Should persist a running task timer through reload and save one time entry", async () => {
        await taskDetails.openProjectTask(projectId, baseTaskId);
        const taskId = await taskDetails.getTaskId();
        const timer = new TaskTimer(page);
        const timeLogs = new TaskTimeLogs(page);
        const originalStorage = await timer.captureStorage();
        let timeLogId: string | undefined;

        try {
            await timer.start();
            await timer.expectRunningAfterReload();
            const timeLog = await timer.stopAndSave();
            timeLogId = timeLog.id;
            expect(timeLog.task).toBe(taskId);
            expect(timeLog.duration).toBeGreaterThanOrEqual(1);
            expect(timeLog.duration).toBeLessThan(60);
            expect(await timeLogs.load(taskId)).toEqual([expect.objectContaining({ id: timeLog.id })]);
        } finally {
            await timer.cancelRunningTimer();
            if (timeLogId) await timeLogs.cleanup(timeLogId);
            await timer.restoreStorage(originalStorage);
        }
    });

    test("Should keep timers independent when switching tasks and save each stopped timer once", async () => {
        const timer = new TaskTimer(page);
        const timeLogs = new TaskTimeLogs(page);
        const originalStorage = await timer.captureStorage();
        const secondTitle = `E06 second timer ${randomUUID()}`;
        let secondTaskId: string | undefined;
        let savedLogId: string | undefined;

        try {
            await taskDetails.openProjectTask(projectId, baseTaskId);
            expect(await timeLogs.load(baseTaskId)).toEqual([]);
            await timer.start();
            await taskDetails.close();
            await board.addTaskToStack(mainStackId, secondTitle);
            secondTaskId = await board.getCardIdByName(secondTitle);
            await taskDetails.openProjectTask(projectId, secondTaskId);
            await timer.start();
            await timer.expectRunningAfterReload();
            expect(await timeLogs.load(secondTaskId)).toEqual([]);

            await taskDetails.openProjectTask(projectId, baseTaskId);
            await timer.expectRunningAfterReload();
            const savedLog = await timer.stopAndSave();
            savedLogId = savedLog.id;
            expect(savedLog.task).toBe(baseTaskId);
            expect(savedLog.duration).toBeGreaterThanOrEqual(1);
            expect(savedLog.duration).toBeLessThan(120);
            await timer.expectStoppedAfterReload();
            expect(await timeLogs.load(baseTaskId)).toEqual([expect.objectContaining({ id: savedLog.id })]);

            await taskDetails.openProjectTask(projectId, secondTaskId);
            await timer.expectRunningAfterReload();
            await timer.cancelRunningTimer();
            await timer.expectStoppedAfterReload();
            expect(await timeLogs.load(secondTaskId)).toEqual([]);
            expect(await timeLogs.load(baseTaskId)).toEqual([expect.objectContaining({ id: savedLog.id })]);
        } finally {
            const errors: unknown[] = [];
            const attempt = async (action: () => Promise<unknown>) => {
                try {
                    await action();
                } catch (error) {
                    errors.push(error);
                }
            };
            for (const id of [baseTaskId, secondTaskId]) {
                if (id)
                    await attempt(async () => {
                        await taskDetails.openProjectTask(projectId, id);
                        await timer.cancelRunningTimer();
                    });
            }
            if (savedLogId) await attempt(() => timeLogs.cleanup(savedLogId!));
            await attempt(() => timer.restoreStorage(originalStorage));
            await attempt(() => taskDetails.openProjectTask(projectId, baseTaskId));
            if (errors.length) throw new AggregateError(errors, "Task-switch timer cleanup failed");
        }
    });

    test("Should cancel, archive, and restore only the selected task", async () => {
        const title = `E07 archive ${randomUUID()}`;
        await taskDetails.close();
        await board.addTaskToStack(mainStackId, title);
        const taskId = await board.getCardIdByName(title);
        const archives = new TaskArchives(page);

        await taskDetails.openProjectTask(projectId, taskId);
        await archives.archiveFromTaskDetails(taskId, false);
        expect((await archives.loadTask(taskId)).archived).toBeNull();
        await board.expectCardVisible(title);

        await archives.archiveFromTaskDetails(taskId, true);
        expect((await archives.loadTask(taskId, true)).archived).toBeTruthy();
        await board.expectCardAbsent(title);

        await archives.openArchivedTasks();
        await archives.expectArchivedTaskVisible(taskId);
        await archives.restoreArchivedTask(taskId);
        expect((await archives.loadTask(taskId)).archived).toBeNull();
        await archives.closeArchivedTasks();
        await board.expectCardVisible(title);
    });

    test("Should cancel deletion and restore or delete only the selected archived task after reload", async () => {
        const archives = new TaskArchives(page);
        const firstTitle = `E07 restore selection ${randomUUID()}`;
        const secondTitle = `E07 delete selection ${randomUUID()}`;

        try {
            await taskDetails.openProjectTask(projectId, baseTaskId);
            await taskDetails.close();
            await board.addTaskToStack(mainStackId, firstTitle);
            const firstId = await board.getCardIdByName(firstTitle);
            await board.addTaskToStack(mainStackId, secondTitle);
            const secondId = await board.getCardIdByName(secondTitle);
            for (const id of [firstId, secondId]) {
                await taskDetails.openProjectTask(projectId, id);
                await archives.archiveFromTaskDetails(id, true);
            }

            await project.goto(`/app/project/${projectId}`);
            await archives.openArchivedTasks();
            await archives.expectArchivedTaskVisible(firstId);
            await archives.expectArchivedTaskVisible(secondId);
            await archives.deleteArchivedTask(firstId, false);
            expect((await archives.loadTask(firstId, true)).archived).toBeTruthy();
            expect((await archives.loadTask(secondId, true)).archived).toBeTruthy();

            await archives.restoreArchivedTask(firstId);
            await archives.expectArchivedTaskVisible(secondId);
            expect((await archives.loadTask(firstId)).archived).toBeNull();
            expect((await archives.loadTask(secondId, true)).archived).toBeTruthy();
            await archives.deleteArchivedTask(secondId, true);
            await archives.closeArchivedTasks();

            await project.goto(`/app/project/${projectId}`);
            await board.expectCardVisible(firstTitle);
            await board.expectCardAbsent(secondTitle);
            await archives.expectTaskMissing(secondId);
            expect((await archives.loadTask(firstId)).archived).toBeNull();
            await archives.openArchivedTasks();
            await archives.expectEmptyArchive();
            await archives.closeArchivedTasks();
        } finally {
            await taskDetails.openProjectTask(projectId, baseTaskId);
        }
    });

    test("Should move only the selected task to another project", async () => {
        test.setTimeout(90_000);
        const title = `E07 move ${randomUUID()}`;
        let destinationProjectId: string | undefined;

        try {
            await taskDetails.openProjectTask(projectId, baseTaskId);
            await taskDetails.close();
            await board.addTaskToStack(mainStackId, title);
            const taskId = await board.getCardIdByName(title);

            destinationProjectId = await project.addNew({ name: `E07 destination ${randomUUID()}` });
            if (!destinationProjectId) throw new Error("Destination project was not created");
            await board.gotoProject(destinationProjectId);
            const destinationStackId = await board.addColumn("E07 destination column");
            const archives = new TaskArchives(page);
            expect((await archives.loadProjectStacks(destinationProjectId)).map(stack => stack.id)).toContain(
                destinationStackId
            );

            await board.gotoProject(projectId);
            await board.openCard(title);
            expect(await taskDetails.getTaskId()).toBe(taskId);
            await archives.moveTaskToProject(taskId, destinationProjectId, destinationStackId);

            const movedTask = await archives.loadTask(taskId);
            expect(movedTask.project).toBe(destinationProjectId);
            expect(movedTask.stack).toBe(destinationStackId);
            const sourceStacks = await archives.loadProjectStacks(projectId);
            const destinationStacks = await archives.loadProjectStacks(destinationProjectId);
            expect(sourceStacks.find(stack => stack.id === mainStackId)?.tasksOrder).not.toContain(taskId);
            expect(destinationStacks.find(stack => stack.id === destinationStackId)?.tasksOrder).toContain(
                taskId
            );

            await board.gotoProject(projectId);
            await board.expectCardAbsent(title);
            await board.gotoProject(destinationProjectId);
            await board.expectCardVisible(title);
        } finally {
            const errors: unknown[] = [];
            const attempt = async (action: () => Promise<unknown>) => {
                try {
                    await action();
                } catch (error) {
                    errors.push(error);
                }
            };
            if (destinationProjectId) {
                await attempt(() => getDb().cleanupProjectTaskRecords(destinationProjectId!));
                await attempt(() => project.deleteById(destinationProjectId!));
            }
            await attempt(() => taskDetails.openProjectTask(projectId, baseTaskId));
            if (errors.length) throw new AggregateError(errors, "Move destination cleanup failed");
        }
    });

    test("Should manage subtasks", async () => {
        const parentTaskId = await taskDetails.getTaskId();

        await test.step("Should add a subtask from the header", async () => {
            await taskDetails.openNewSubtaskInput();
            await taskDetails.subtasks.saveSubtask("Subtask 1");
        });

        await test.step("Should update the completion counter and persist it", async () => {
            await expect(await taskDetails.subtasks.countSubtasks()).toBe(1);
            await taskDetails.subtasks.expectCompletionProgress(0);

            await taskDetails.subtasks.toggleCompletion("Subtask 1");
            await taskDetails.subtasks.expectSubtaskCompletion("Subtask 1", true);
            await taskDetails.subtasks.expectCompletionProgress(100);

            await taskDetails.reload();
            await taskDetails.subtasks.expectSubtaskVisible("Subtask 1");
            await taskDetails.subtasks.expectSubtaskCompletion("Subtask 1", true);
            await taskDetails.subtasks.expectCompletionProgress(100);

            await taskDetails.subtasks.toggleCompletion("Subtask 1");
            await taskDetails.subtasks.expectSubtaskCompletion("Subtask 1", false);
            await taskDetails.subtasks.expectCompletionProgress(0);
        });

        await test.step("Should add a subtask using the keyboard shortcut", async () => {
            await taskDetails.subtasks.pressAddHotkey();
            await taskDetails.subtasks.saveSubtask("Subtask via hotkey");
            await taskDetails.subtasks.expectSubtaskVisible("Subtask via hotkey");
        });

        await test.step("Should add a subtask from the task details mid section", async () => {
            const countBefore = await taskDetails.subtasks.countSubtasks();
            await taskDetails.subtasks.addSubtask("Subtask from mid section");
            await taskDetails.subtasks.expectSubtaskVisible("Subtask from mid section");
            const countAfter = await taskDetails.subtasks.countSubtasks();
            await expect(countAfter).toBe(countBefore + 1);
        });
        await test.step("Should toggle subtask completion from the list", async () => {
            await taskDetails.subtasks.toggleCompletion("Subtask 1");
            await taskDetails.subtasks.expectSubtaskCompletion("Subtask 1", true);
            await taskDetails.subtasks.toggleCompletion("Subtask 1");
            await taskDetails.subtasks.expectSubtaskCompletion("Subtask 1", false);
        });
        await test.step("Should add dates and persist them", async () => {
            const selectedRange = await taskDetails.subtasks.setNextWeekDates("Subtask 1");
            await taskDetails.reload();
            await expect(await taskDetails.subtasks.getDateRangeText("Subtask 1")).toEqual(selectedRange);
            await taskDetails.subtasks.expectSubtaskVisible("Subtask 1");
            await taskDetails.subtasks.expectSubtaskPersisted(projectId, parentTaskId, "Subtask 1");
        });

        await test.step("Should assign the current user and persist it", async () => {
            await taskDetails.subtasks.toggleCurrentUserAssignment("Subtask 1");
            await taskDetails.reload();
            await taskDetails.subtasks.expectCurrentUserAssignment("Subtask 1", true);
            await taskDetails.expectTaskId(parentTaskId);
            await taskDetails.subtasks.expectSubtaskPersisted(projectId, parentTaskId, "Subtask 1");

            await taskDetails.subtasks.toggleCurrentUserAssignment("Subtask 1");
            await taskDetails.subtasks.expectCurrentUserAssignment("Subtask 1", false);
            await taskDetails.expectTaskId(parentTaskId);
        });
        await test.step("Should expose the implemented subtask menu actions", async () => {
            await taskDetails.subtasks.expectMenuActions("Subtask 1");
        });

        await test.step("Should edit a subtask inline from its menu", async () => {
            await taskDetails.subtasks.editInlineFromMenu("Subtask 1", "Subtask 1 edited inline");
            await taskDetails.reload();
            await taskDetails.subtasks.expectSubtaskVisible("Subtask 1 edited inline");
            await taskDetails.subtasks.expectSubtaskPersisted(
                projectId,
                parentTaskId,
                "Subtask 1 edited inline"
            );
        });

        await test.step("Should edit a subtask inline with the platform modifier", async () => {
            await taskDetails.subtasks.editInlineWithModifier(
                "Subtask 1 edited inline",
                "Subtask 1 edited with modifier"
            );
            await taskDetails.reload();
            await taskDetails.subtasks.expectSubtaskVisible("Subtask 1 edited with modifier");
            await taskDetails.subtasks.expectSubtaskPersisted(
                projectId,
                parentTaskId,
                "Subtask 1 edited with modifier"
            );
        });

        await test.step("Should detach a subtask and persist the relationship change", async () => {
            const countBefore = await taskDetails.subtasks.countSubtasks();
            await taskDetails.subtasks.detachSubtask("Subtask from mid section");
            await taskDetails.reload();
            await taskDetails.subtasks.expectSubtaskVisible("Subtask 1 edited with modifier");
            await taskDetails.subtasks.expectSubtaskVisible("Subtask via hotkey");
            await taskDetails.subtasks.expectSubtaskHidden("Subtask from mid section");
            await expect(await taskDetails.subtasks.countSubtasks()).toBe(countBefore - 1);
        });

        await test.step("Should delete a subtask and persist the removal", async () => {
            const countBefore = await taskDetails.subtasks.countSubtasks();
            await taskDetails.subtasks.deleteSubtask("Subtask via hotkey");
            await taskDetails.reload();
            await taskDetails.subtasks.expectSubtaskVisible("Subtask 1 edited with modifier");
            await taskDetails.subtasks.expectSubtaskHidden("Subtask via hotkey");
            await expect(await taskDetails.subtasks.countSubtasks()).toBe(countBefore - 1);
        });

        await test.step("Should open a subtask and return to its parent", async () => {
            const parentTitle = await taskDetails.getTitle();
            const childTitle = "Subtask 1 edited with modifier";
            const siblingTitle = "Task navigation sibling";
            await taskDetails.close();
            await board.addTaskToStack(mainStackId, siblingTitle);
            await board.openCard(parentTitle);
            await taskDetails.navigateNext(parentTitle);
            const archives = new TaskArchives(page);
            const nextTaskId = await taskDetails.getTaskId();
            expect((await archives.loadTask(nextTaskId)).project).toBe(projectId);
            const stacks = await archives.loadProjectStacks(projectId);
            expect(stacks.some(stack => stack.tasksOrder.includes(nextTaskId))).toBe(true);
            await taskDetails.navigatePrevious(parentTitle);
            await taskDetails.subtasks.openSubtask(childTitle);
            await taskDetails.expectTitle(childTitle);
            await page.goBack();
            await taskDetails.expectTitle(parentTitle);
            await page.goForward();
            await taskDetails.expectTitle(childTitle);
            await taskDetails.openParentTask(parentTitle);
            await taskDetails.close();
            await board.openCard(parentTitle);
            await taskDetails.expectTitle(parentTitle);
        });
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
