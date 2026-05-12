// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Task CRUD, move, archive, duplicate.
 */
import { translate } from "@stacks/translations";
import { Intent } from "@blueprintjs/core";
import { produce } from "immer";
import kebabCase from "lodash/kebabCase";
import union from "lodash/union";
import without from "lodash/without";
import xor from "lodash/xor";

import {
    addDays,
    addMonths,
    addWeeks,
    addYears,
    differenceInDays,
    endOfMonth,
    format,
    getDay,
    isBefore,
    setDate,
} from "date-fns";
import { ExtendedKeyboardEvent } from "mousetrap";
import {
    ACTIVITYRESOURCETYPE,
    ACTIVITYTYPE,
    AUTOMATION_EVENT,
    IElectronSaveDialog,
    ILink,
    ILocation,
    IPermissions,
    IRepeats,
    IStack,
    ITask,
    IUpdate,
    POLLINGACTIONS,
    PRIORITY,
    REPEATTYPE,
} from "@stacks/types";
import api, { PermissionsAPI, TaskLoadParams, TasksAPI } from "app/api";
import {
    getCurrentProjectId,
    getCurrentTaskId,
    getMe,
    getStack,
    getStackTasks,
    getSubtasks,
    nav,
    publish,
    subscribe,
} from "app/hooks";
import { ITasksStore, TasksStore } from "app/store/tasks";
import { upsertById } from "../actionHelpers";
import { reorderWithAfter } from "app/utils/array";
import { isDo, isOverdue, isStarted } from "app/utils/date";
import Dialog from "app/utils/dialog";
import sound from "app/utils/sound";
import { stripMd } from "app/utils/string";
import { CopyMoveStore } from "../copymove";
import { showPermissions } from "../global";
import { NavigationStore } from "../navigation";
import { PeopleStore } from "../people";
import { ProjectFiltersStore } from "../projectFilters";
import { RecordsStore } from "../records";
import { IStacksStore, StacksStore } from "../stacks";
import { ActivitiesActions } from "./activities";
import { AutomationsActions } from "./automations";
import { cleanupResourceNavigationRefs } from "./resourceNavigationCleanup";
import { ProjectsActions } from "./projects";
import { RecordActions } from "./record";

/**
 * Load all tasks based on a given project id
 * @param projectId
 * @returns
 */
const loadByProject = async (projectId: string, silent?: boolean): Promise<ITask[]> => {
    // eslint-disable-next-line no-console
    // console.log("--- loadByProject ---", projectId);

    // const tasksIs = await ProjectsActions.getTasks(projectId);

    TasksStore.set(
        produce((state: ITasksStore) => {
            if (silent != null) {
                state.isLoading = true;
            }
            // state.loadingChunk = uniq([...state.loadingChunk, ...tasksIs]);
            state.loadedProjects = union(state.loadedProjects, [projectId]);
        })
    );

    const tasks = await TasksAPI.load({ project: [projectId] });
    await upsertTasks(tasks);
    return tasks;
};

/**
 * Loads a chunk of tasks based on the list of ids provided
 * @param taskIds
 * @param clean
 */
const loadSegment = async (taskIds: string[], forceReload?: boolean): Promise<ITask[]> => {
    let tasksToLoad: string[] = [];
    // if we do not force reload the requested tasks
    // then build an array of tasks to reload
    if (!forceReload) {
        const loadedTasksIds = TasksStore.get().tasks.map(task => task.id);
        const loadingTaskIds = TasksStore.get().loadingChunk;
        tasksToLoad = taskIds.filter(
            taskId => !loadedTasksIds.includes(taskId) && !loadingTaskIds.includes(taskId)
        );
    }

    // if there are tasks to be loaded
    // then set the `isLoadingChunk` to true
    if (tasksToLoad.length) {
        TasksStore.set(
            produce((state: ITasksStore) => {
                state.loadingChunk = union(state.loadingChunk, tasksToLoad);
            })
        );
        const tasks = await TasksAPI.load({ ids: tasksToLoad });
        await upsertTasks(tasks);
        return tasks;
    }

    return [];
};

const loadPeriod = async (from: Date, to: Date, options?: Omit<TaskLoadParams, "from" | "to">) => {
    const tasks = await TasksAPI.load({
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
        ...options,
    });
    await upsertTasks(tasks);
    return tasks;
};

/**
 * Force reloads a tasks and updates the current store
 * @param taskId
 */
const reloadOne = async (taskId: string) => {
    const tasks = await TasksAPI.load({ ids: [taskId] });

    if (tasks.length === 1) {
        await upsertTasks(tasks);
    } else {
        await remove(taskId, true);
    }
};

/**
 * Reloads a project task triggered by the SSE event
 * @param activity
 * @returns
 */
const reloadTask = async (update: IUpdate) => {
    if (update.action === POLLINGACTIONS.DELETED) {
        await remove(update.record, true);
    } else {
        await reloadOne(update.record);
    }
};

/**
 * Loads a user's tasks based on a filter
 * @param filters
 * @returns
 */
const loadMy = async (): Promise<ITask[]> => {
    const me = getMe();
    if (!me) {
        return [];
    }

    TasksStore.set(
        produce((state: ITasksStore) => {
            state.isLoading = true;
        })
    );

    const myTasks = await TasksAPI.load({ assignees: [me.id] });

    await upsertTasks(myTasks);

    return myTasks;
};

/**
 * Loads all the archived tasks for the given projects
 * @param project
 * @returns
 */
const loadArchived = async (project: string[]): Promise<ITask[]> => {
    TasksStore.set(
        produce((state: ITasksStore) => {
            state.isLoadingArchived = true;
        })
    );

    const tasks = await TasksAPI.load({ project, archived: true });
    await upsertTasks(tasks);
    return tasks;
};

// const moveToStack = async (taskId: string, targetStack: string, targetPosition: number, sourcePositionOpt?: number) => {
const moveToStack = async (taskId: string, stackId: string, position: number) => {
    const task = await getTask(taskId);
    if (!task) return;

    const stackTasks = getStackTasks(stackId);
    const sourcePosition = stackTasks.findIndex(task => task.id === taskId);

    // If moving within the same stack
    if (task.stack === stackId) {
        await moveTaskWithinStack(taskId, stackId, sourcePosition, position);
    }
    // Moving to a different stack
    else {
        await moveTaskBetweenStacks(taskId, task.stack, stackId, sourcePosition, position);
    }
};

/**
 * Moves a task within the same stack, updating positions accordingly
 */
const moveTaskWithinStack = async (
    taskId: string,
    stackId: string,
    sourcePosition: number,
    targetPosition: number
) => {
    const stack = getStack(stackId);
    if (!stack) return;
    const { order: nextOrder, after } = reorderWithAfter(
        stack.tasksOrder,
        taskId,
        sourcePosition,
        targetPosition
    );

    StacksStore.set(
        produce((state: IStacksStore) => {
            state.stacks = state.stacks.map((stack: IStack) => {
                if (stack.id === stackId) {
                    stack.tasksOrder = nextOrder;
                }

                return stack;
            });
        })
    );

    await TasksAPI.move(taskId, stackId, after ?? undefined);
};

/**
 * Moves a task between different stacks, updating positions in both stacks
 */
const moveTaskBetweenStacks = async (
    taskId: string,
    sourceStack: string,
    targetStack: string,
    sourcePosition: number,
    targetPosition: number
) => {
    const destinationStack = getStack(targetStack);
    if (!destinationStack) return;

    const insertIndex = Math.min(Math.max(targetPosition, 0), destinationStack.tasksOrder.length);
    const destinationOrder = [...destinationStack.tasksOrder];
    destinationOrder.splice(insertIndex, 0, taskId);
    const after = insertIndex > 0 ? destinationOrder[insertIndex - 1] : null;

    StacksStore.set(
        produce((state: IStacksStore) => {
            state.stacks = state.stacks.map((stack: IStack) => {
                if (stack.id === sourceStack) {
                    // removing the task from the old stack
                    stack.tasksOrder = stack.tasksOrder.filter(task => task !== taskId);
                } else if (stack.id === targetStack) {
                    stack.tasksOrder = destinationOrder;
                }

                return stack;
            });
        })
    );

    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks = state.tasks.map((task: ITask) => {
                if (task.id === taskId) {
                    return { ...task, stack: targetStack };
                }
                return task;
            });
        })
    );

    await TasksAPI.move(taskId, targetStack, after ?? undefined);
};

/**
 * Returns the currently opened task
 * This assumes that the task details is open
 */
const getCurrent = async (): Promise<undefined | ITask> => {
    const currentTaskId = getCurrentTaskId();
    return await getTask(currentTaskId);
};

/**
 * Updates a specific task
 * @param taskId
 * @param updatedTask
 * @returns
 */
const update = async (taskId: string, updatedTask: Partial<ITask>, skipSave?: boolean): Promise<ITask> => {
    const updatedTaskData: Partial<ITask> = {
        ...updatedTask,
    };

    if (updatedTask.done != null) {
        updatedTaskData.completed = updatedTask.done ? new Date() : undefined;
    }

    const previousTask = await getTask(taskId);

    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks = state.tasks.map((task: ITask) => {
                if (task.id === taskId) return { ...task, ...updatedTaskData, updated: new Date() };
                return task;
            });
        })
    );

    if (!skipSave) {
        await TasksAPI.update(taskId, updatedTaskData);
    }

    if (previousTask) {
        TaskLog(previousTask, updatedTaskData);
    }

    const newUpdatedTask = TasksStore.get().tasks.find(task => task.id === taskId);
    publish("task:updated", newUpdatedTask);

    return newUpdatedTask!;
};

/**
 * Replaces a task in the store
 * @param replacedTask
 * @param skipSave
 */
const replaceTask = (replacedTask: ITask, skipSave?: boolean) => {
    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks = state.tasks.map((task: ITask) => {
                if (task.id === replacedTask.id) return replacedTask;
                return task;
            });
        })
    );

    if (!skipSave) api("tasks/update", replacedTask);
};

/**
 * Inserts if missing or updates a task in the store
 * @param tasks
 */
const upsertTasks = async (tasks: ITask[]) => {
    const newTaskIds = tasks.map((task: ITask) => task.id);

    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks = upsertById(state.tasks, tasks);
            state.loadingChunk = without(state.loadingChunk, ...newTaskIds);
            state.isLoading = false;
            state.isLoadingArchived = false;
        })
    );

    for (const task of tasks) {
        if (task.duedate && isOverdue(task.duedate)) {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.OVERDUE, task.project);
        } else if (task.startdate && isStarted(task.startdate)) {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.STARTED, task.project);
        } else if (task.dodate && isDo(task.dodate)) {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.DO, task.project);
        }
    }

    publish("tasks:upserted", tasks);
};

/**
 * Add a new task to the the tasks store and assign it to the desired stack
 * This will also save the task in the database
 * @param taskData
 * @param top
 */
const add = async (taskData: Partial<ITask>, top?: boolean) => {
    const task = await TasksAPI.add(taskData, top);

    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks.push(task);
        })
    );

    // add task id to the stack tasks order
    StacksStore.set(
        produce((state: IStacksStore) => {
            state.stacks = state.stacks.map((stack: IStack) => {
                if (stack.id === task.stack) {
                    return {
                        ...stack,
                        tasksOrder: top ? [task.id, ...stack.tasksOrder] : [...stack.tasksOrder, task.id],
                    };
                }
                return stack;
            });
        })
    );

    publish("task:created", { taskId: task.id, task });

    return task;
};

/**
 * Adds and saves multiple tasks
 * @param tasks
 * @param stackId
 * @param top
 * @returns
 */
const addMultiple = async (tasks: Partial<ITask>[], top?: boolean) => {
    const newTasks: ITask[] = [];

    for (const task of tasks) {
        const newTask = await add(task, top);
        newTasks.push(newTask);
    }

    return newTasks;
};

/**
 * Deletes a task
 * @param taskId
 * @param local Whether to skip deleting the task from the server
 * @returns
 */
const remove = async (taskId: string, local?: boolean) => {
    const task = await getTask(taskId);
    if (!task) return;

    try {
        // deletes the tasks
        if (!local) {
            await TasksAPI.delete(taskId);
        }

        // remove the task from the store's list of tasks
        removeFromList(taskId);

        await cleanupResourceNavigationRefs(taskId);
        RecordActions.removeTimer(task.id);
    } catch (e) {
        window.toaster.show({
            message: "Task could not be removed",
            intent: Intent.DANGER,
        });
    }
};

/**
 * Removes the selected (by keyboard) task
 * @returns
 */
const removeSelected = async () => {
    const { tasks } = NavigationStore.get();
    if (!tasks.length) return;

    const response = await Dialog.confirm(
        translate("Delete task", { suffix: "(s)?" }),
        translate("Are you sure you want to delete this task All sub tasks and attachments will also be deleted This action cannot be undone"),
        Intent.DANGER
    );
    if (response) {
        tasks.forEach(async (taskId: string) => await remove(taskId));
        // reseting the selected tasks
        NavigationStore.set(state => ({ ...state, tasks: [] }));
    }
};

/**
 * This will remove the task from the current tasks store
 * @param taskId
 */
const removeFromList = (taskId: string) => {
    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks = state.tasks.filter((task: ITask) => task.id !== taskId);
        })
    );
};

/**
 * Remove multiple tasks from the current tasks store
 * @param taskIds
 */
const removeMultipleFromList = (taskIds: string[]) => {
    TasksStore.set(
        produce((state: ITasksStore) => {
            state.tasks = state.tasks.filter((task: ITask) => !taskIds.includes(task.id));
        })
    );
};

/**
 * Remove a subtask and all its children subtasks (recursivelly)
 * @param parentTaskId
 * @returns
 */
const recursivelyRemoveSubtasks = async (parentTaskId: string) => {
    const subtasks = getSubtasks(parentTaskId);

    for (const subtask of subtasks) {
        await recursivelyRemoveSubtasks(subtask.id);
        await remove(subtask.id);
    }
};

/**
 * Delete a task with confirmation dialog
 * @param taskId
 */
const alertDelete = async (taskId: string) => {
    const response = await Dialog.confirm(
        translate("Delete task", { suffix: "?" }),
        translate("Are you sure you want to delete this task All sub tasks and attachments will also be deleted This action cannot be undone"),
        Intent.DANGER
    );

    if (response) {
        await recursivelyRemoveSubtasks(taskId);
        await remove(taskId);
    }

    return response;
};

/**
 * Delete multiple tasks with confirmation dialog
 * @param taskIds
 */
const alertDeleteMultiple = async (taskIds: string[]) => {
    const response = await Dialog.confirm(
        translate("Delete task", { suffix: "(s)?" }),
        translate("Are you sure you want to delete this task All sub tasks and attachments will also be deleted This action cannot be undone"),
        Intent.DANGER
    );
    if (response) {
        for (const taskId of taskIds) {
            await recursivelyRemoveSubtasks(taskId);
            await remove(taskId);
        }
    }
};

/**
 * Attaching a main task as a subtask to another task
 * @param taskId
 * @param parentTaskId
 * @returns
 */
const attach = async (taskId: string, parentTaskId: string) => {
    const subtask = await getTask(taskId);
    if (!subtask) return;

    const parentTask = await getTask(parentTaskId);
    if (!parentTask) return;

    // setting the subtasks parent id
    await update(taskId, {
        parent: parentTaskId,
    });

    // await StacksActions.removeTasks([taskId]);
};

const alertDetach = async (taskId: string) => {
    const response = await Dialog.confirm(translate("Detach subtask"), translate("Are you sure you want to detach this subtask from its parent task"));

    if (response) {
        await update(taskId, {
            parent: undefined,
        });
    }

    return response;
};

/**
 * Returns a single task based on the task id provided
 * If the task is not present in the store it will be loaded
 * @param taskId
 * @returns ITask | undefined
 */
export const getTask = async (taskId: string): Promise<ITask> => {
    const localTask = TasksStore.get().tasks.find((task: ITask) => task.id === taskId);
    if (localTask) return localTask;

    // if the requested task is in the loading queue
    // then wait for it to load
    if (TasksStore.get().loadingChunk.includes(taskId)) {
        return new Promise(resolve => {
            const listener = subscribe<ITask[]>("tasks:upserted", updatedTasks => {
                const task = updatedTasks.find(t => t.id === taskId);
                if (task) {
                    listener.unsubscribe();
                    resolve(task);
                }
            });
        });
    }

    const tasks = await loadSegment([taskId]);
    await upsertTasks(tasks);
    return tasks[0];
};

/**
 * Returns multiple tasks based on the list of task ids provided
 * !! This will only return currently loaded tasks
 * @param taskIds
 * @returns ITask[]
 */
export const getTasks = (taskIds: string[]): ITask[] => {
    return TasksStore.get().tasks.filter((task: ITask) => taskIds.includes(task.id));
};

/**
 * Sets the task title
 * @param taskId
 * @param title
 * @returns
 */
const setTitle = async (taskId: string, title: string) => {
    return await update(taskId, { title });
};

/**
 * Toggle the done state of a task
 * @param taskId
 * @param skipAutomations
 * @returns
 */
const toggleDone = async (taskId: string, skipAutomations?: boolean) => {
    const task = await getTask(taskId);
    if (!task) return;

    if (!task.done) {
        await setDone(taskId, skipAutomations);
    } else {
        if (task.parent == null) {
            await setTodo(taskId, skipAutomations);
        } else {
            await setTodo(taskId);
        }
    }
};

/**
 * Toggle the done/todo state of all the selected tasks
 * @param event
 * @returns
 */
const toggleSelected = (event: ExtendedKeyboardEvent) => {
    event.preventDefault();
    const { tasks } = NavigationStore.get();
    if (!tasks.length) return;

    tasks.forEach(task => toggleDone(task));
    return false;
};

interface IDebounceRemoveTasks {
    [id: string]: NodeJS.Timeout | undefined;
}
const debounceRemove: IDebounceRemoveTasks = {};

/**
 * Sets a task as done
 * @param taskId
 * @param skipAutomations
 */
const setDone = async (taskId: string, skipAutomations?: boolean) => {
    const task = await getTask(taskId);
    if (!task) return;

    // update the task
    const updatedTask: ITask = await update(taskId, { done: true, progress: 100 });

    await runRepeatAutomation(updatedTask);

    // run automations if not skipped or if the repeats is not set to reopen
    if (!skipAutomations && (task.repeats == null || (task.repeats != null && !task.repeats.reopen))) {
        await AutomationsActions.run(taskId, AUTOMATION_EVENT.DONE, updatedTask.project);
    }

    sound.play("complete");
};

/**
 * Sets a task as todo
 * @param taskId
 * @param skipAutomations
 */
const setTodo = async (taskId: string, skipAutomations?: boolean) => {
    const updatedTask = await update(taskId, { done: false, progress: 0 });

    // if the filter is set to show either all tasks or unfinished tasks
    // then we should put it back in the store
    if (!ProjectFiltersStore.get().filters.state) {
        upsertTasks([updatedTask]);
    }

    if (!skipAutomations) {
        await AutomationsActions.run(taskId, AUTOMATION_EVENT.TODO, updatedTask.project);
    }

    if (debounceRemove[taskId]) {
        clearTimeout(debounceRemove[taskId]);
        debounceRemove[taskId] = undefined;
    }
};

/**
 * Sets a tasks parent
 * @param subtaskId
 * @param parent
 */
const setParent = async (taskId: string, parent: string) => {
    await update(taskId, { parent });
};

/**
 * Assigns multiple people to the task
 * @param taskId
 * @param assignees
 * @returns
 */
const setAssignees = async (taskId: string, assignees: string[]) => {
    return await update(taskId, { assignees });
};

/**
 * Toggles a person from a task
 * @param taskId
 * @param personId
 * @returns
 */
const toggleAssignee = async (taskId: string, personId: string) => {
    const task = await getTask(taskId);
    if (!task) return;
    return await setAssignees(taskId, xor(task.assignees || [], [personId]));
};

/**
 * Assigns a single person to the task
 * If already present does nothing
 * @param taskId
 * @param personId
 * @returns
 */
const assignPerson = async (taskId: string, personId: string) => {
    const task = await getTask(taskId);
    if (!task) return;
    if (task.assignees && task.assignees.includes(personId)) return;
    return await update(taskId, { assignees: [...(task.assignees || []), personId] });
};

/**
 * Removes a person from a task
 * If not present does nothing
 * @param taskId
 * @param personId
 * @returns
 */
const unassignPerson = async (taskId: string, personId: string) => {
    const task = await getTask(taskId);
    if (!task) return;
    if (task.assignees && !task.assignees.includes(personId)) return;
    await update(taskId, { assignees: (task.assignees || []).filter((id: string) => id !== personId) });
};

interface IDebounceDatesTasks {
    [id: string]: NodeJS.Timeout | undefined;
}
const debounceStartDates: IDebounceDatesTasks = {};
const debounceDueDates: IDebounceDatesTasks = {};

const setDates = async (taskId: string, startdate: Date | null, duedate: Date | null) => {
    const task = await update(taskId, { startdate, duedate });

    if (debounceStartDates[taskId]) {
        clearTimeout(debounceStartDates[taskId]);
        delete debounceStartDates[taskId];
    }
    if (debounceDueDates[taskId]) {
        clearTimeout(debounceDueDates[taskId]);
        delete debounceDueDates[taskId];
    }

    if (duedate && isBefore(new Date(duedate), new Date())) {
        debounceDueDates[taskId] = setTimeout(async () => {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.OVERDUE, task.project);
        }, 5000);
    } else if (startdate && isBefore(new Date(startdate), new Date())) {
        debounceStartDates[taskId] = setTimeout(async () => {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.STARTED, task.project);
        }, 5000);
    }
};

const setStartDate = async (taskId: string, startdate: Date | null) => {
    const task = await update(taskId, { startdate });

    if (debounceStartDates[taskId]) {
        clearTimeout(debounceStartDates[taskId]);
        delete debounceStartDates[taskId];
    }

    if (startdate && isBefore(new Date(startdate), new Date())) {
        debounceStartDates[taskId] = setTimeout(async () => {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.STARTED, task.project);
        }, 2000);
    }
};

const setDueDate = async (taskId: string, duedate: Date | null) => {
    const task = await update(taskId, { duedate });

    if (debounceDueDates[taskId]) {
        clearTimeout(debounceDueDates[taskId]);
        delete debounceDueDates[taskId];
    }

    if (duedate && isBefore(new Date(duedate), new Date())) {
        debounceDueDates[taskId] = setTimeout(async () => {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.OVERDUE, task.project);
        }, 2000);
    }
};

const debounceDoDates: IDebounceDatesTasks = {};
const setDoDate = async (taskId: string, dodate: Date | null) => {
    const task = await update(taskId, { dodate });

    if (debounceDoDates[taskId]) {
        clearTimeout(debounceDoDates[taskId]);
        delete debounceDoDates[taskId];
    }

    if (dodate && isBefore(new Date(dodate), new Date())) {
        debounceDoDates[taskId] = setTimeout(async () => {
            await AutomationsActions.run(task.id, AUTOMATION_EVENT.DO, task.project);
        }, 2000);
    }
};

const setCompletedDate = async (taskId: string, completed: Date) => {
    await update(taskId, { completed });
};

/**
 * Sets a task priority
 * @param taskId
 * @param priority
 */
const setPriority = async (taskId: string, priority: PRIORITY | null) => {
    await update(taskId, { priority });
};

/**
 * Assigns a project to a task
 * @param taskId
 * @param project
 */
const setProject = async (taskId: string, project: string) => {
    await update(taskId, { project });
};

const setStatus = async (taskId: string, status?: string) => {
    const task = await getTask(taskId);
    if (!task) return;
    if (task.status === status) return;
    await update(taskId, { status });
};

const setTags = async (taskId: string, tags: string[]) => {
    return await update(taskId, {
        tags,
    });
};

const setDependencies = async (taskId: string, dependencies: string[]) => {
    return await update(taskId, {
        dependencies,
    });
};

const addTag = async (taskId: string, tagId: string) => {
    const task = await getTask(taskId);
    if (!task) return;
    if (task.tags && task.tags.includes(tagId)) return;
    await update(taskId, { tags: [...(task.tags || []), tagId] });
};

const addTags = async (taskId: string, tagIds: string[]) => {
    const task = await getTask(taskId);
    if (!task) return;

    // check if the tags are already set in the task
    if (tagIds.every(tagId => (task.tags ?? []).includes(tagId))) return;

    await update(taskId, { tags: [...new Set([...(task.tags || []), ...tagIds])] });
};

/**
 * Toggle a tag for the requested task (if there removes it otherwise adds it)
 * @param taskId
 * @param tagId
 * @returns
 */
const toggleTag = async (taskId: string, tagId: string) => {
    const task = await getTask(taskId);
    if (!task) return;
    return await setTags(taskId, xor(task.tags, [tagId]));
};

/**
 * Removes all tags from the params from the requested task
 * @param taskId
 * @param tagIds
 * @returns
 */
const removeTags = async (taskId: string, tagIds: string[]) => {
    const task = await getTask(taskId);
    if (!task) return;
    await update(taskId, { tags: without(task.tags || [], ...tagIds) });
};

/**
 * Clears all assigned tags for the requested task
 * @param taskId
 */
const clearTags = async (taskId: string) => {
    await update(taskId, {
        tags: [],
    });
};

/**
 * Sets the progress for a specific task
 * @param taskId
 * @param progress
 * @returns
 */
const setProgress = async (taskId: string, progress: number) => {
    const task = await getTask(taskId);
    if (!task) return;
    if (task.progress === progress) return;

    await update(taskId, { progress, done: progress === 100 });
    if (progress === 100) {
        await AutomationsActions.run(taskId, AUTOMATION_EVENT.DONE, task.project);
    } else if (task.done) {
        await AutomationsActions.run(taskId, AUTOMATION_EVENT.TODO, task.project);
    }
};

/**
 * Updates a task description
 * @param taskId
 * @param description
 */
const setDescription = async (taskId: string, description: string) => {
    await update(taskId, { description });
};

const setEstimate = async (taskId: string, estimate?: number) => {
    await update(taskId, { estimate });
};

const setRepeats = async (taskId: string, repeats?: IRepeats) => {
    await update(taskId, { repeats });
};

const addLink = async (taskId: string, link: ILink) => {
    const task = await getTask(taskId);
    if (!task) return;
    await update(taskId, { links: [...(task.links || []), link] });
};

const removeLink = async (taskId: string, linkId: string) => {
    const task = await getTask(taskId);
    if (!task) return;

    const response = await Dialog.confirm("Delete link", "Are you sure you want to delete this link?");

    if (response) {
        await update(taskId, { links: task.links?.filter((link: ILink) => link.id !== linkId) });
    }
};

const updateLink = async (taskId: string, link: ILink) => {
    const task = await getTask(taskId);
    if (!task) return;
    await update(taskId, { links: task.links?.map((lnk: ILink) => (lnk.id === link.id ? link : lnk)) });
};

const addLocation = async (taskId: string, location: ILocation) => {
    const task = await getTask(taskId);
    if (!task) return;
    await update(taskId, { locations: [...(task.locations || []), location] });
};

const removeLocation = async (taskId: string, locationId: string) => {
    const task = await getTask(taskId);
    if (!task) return;
    await update(taskId, {
        locations: task.locations?.filter((location: ILocation) => location.id !== locationId),
    });
};

/**
 * Reorders subtasks for a parent. Indices are in the same space as the subtask DnD list (visible rows only).
 * @param visibleOrderedIds Task ids in the order shown in the UI (e.g. filtered + sorted by subtasksOrder)
 */
const setSubtaskPosition = async (
    parentId: string,
    subtasksId: string,
    targetPosition: number,
    sourcePosition: number,
    visibleOrderedIds: string[]
) => {
    TasksStore.set(
        produce((state: ITasksStore) => {
            const parent = state.tasks.find(t => t.id === parentId);
            if (!parent) return;

            const childIds = state.tasks.filter(t => t.parent === parentId).map(t => t.id);
            const childSet = new Set(childIds);

            let order = [...(parent.subtasksOrder?.length ? parent.subtasksOrder : childIds)];
            order = order.filter(id => childSet.has(id));
            for (const id of childIds) {
                if (!order.includes(id)) order.push(id);
            }

            const visibleSet = new Set(visibleOrderedIds);
            if (visibleOrderedIds.length === 0 || !visibleSet.has(subtasksId)) {
                const { order: next } = reorderWithAfter(order, subtasksId, sourcePosition, targetPosition);
                parent.subtasksOrder = next;
                return;
            }

            const { order: reorderedVisible } = reorderWithAfter(
                [...visibleOrderedIds],
                subtasksId,
                sourcePosition,
                targetPosition
            );

            let vi = 0;
            parent.subtasksOrder = order.map(id => (visibleSet.has(id) ? reorderedVisible[vi++] : id));

            if (vi !== reorderedVisible.length) {
                parent.subtasksOrder = order;
            }
        })
    );

    const parent = await getTask(parentId);
    if (!parent) return;

    await update(parentId, { subtasksOrder: parent.subtasksOrder });
};

/* COVERS - START */
const addCover = async (taskId: string, cover: string) => {
    await update(taskId, { cover });
};

const removeCover = async (taskId: string) => {
    await update(taskId, { cover: undefined });
};
/* COVERS - END */

const deleteAttachment = async (taskId: string, hash: string) => {
    setTimeout(async () => {
        const task = await getTask(taskId);
        if (!task) return;

        const result = await Dialog.confirm(
            "Delete attachment",
            "Are you sure you want to delete this attachment?"
        );

        if (!result) return;
        await api("tasks/fileDelete", task.id, hash);
        // await update(taskId, { attachments: (task.attachments || []).filter(file => file !== fileName) });
    });
};

/**
 * Sets a custom field value
 * @param fieldId
 * @param fieldValue
 * @returns
 */
const setFieldValue = async (taskId: string, fieldId: string, fieldValue: string) => {
    const task = await getTask(taskId);
    if (!task) return;

    const fields = { ...(task.fields ?? {}) };
    fields[fieldId] = fieldValue;

    await update(taskId, { fields });
};

const setTint = async (taskId: string, tint?: string) => {
    await update(taskId, { tint });
};

const setHourlyRate = async (taskId: string, hourlyRate?: number) => {
    await update(taskId, { hourlyRate: hourlyRate && hourlyRate > 0 ? hourlyRate : undefined });
};

/**
 * Archive the current task
 * @param taskId
 * @param skipAutomations
 */
const archive = async (taskId: string, skipAutomations?: boolean) => {
    const task = await getTask(taskId);
    if (!task) return;
    // skip archivation if the task is a subtask
    if (task.parent != undefined) return;

    if (window.location.hash.includes(taskId)) {
        nav(`/project/${task.project}`);
    }

    // update the task's archived date and save it
    await update(taskId, { archived: new Date() });
    try {
        await TasksAPI.archive(taskId);
    } catch (error) {
        window.toaster.show({
            message: "Task could not be archived",
            intent: Intent.DANGER,
        });
        return;
    }

    // removes if any running timers
    RecordActions.removeTimer(taskId);

    if (!skipAutomations) {
        await AutomationsActions.run(taskId, AUTOMATION_EVENT.ARCHIVED, task.project);
    }
};

/**
 * Archives a task with a confirmation dialog
 * @param taskId
 * @returns
 */
const archiveAlert = async (taskId: string) => {
    const result = await Dialog.confirm(
        translate("Archive task"),
        translate("Are you sure you want to archive this task"),
        Intent.WARNING
    );

    if (!result) return;

    await archive(taskId);
};

const unarchive = async (taskId: string, stackId?: string) => {
    const data: Partial<ITask> = {
        archived: null,
    };
    if (stackId) {
        data.stack = stackId;
    }

    await update(taskId, data);

    try {
        await TasksAPI.unarchive(taskId, stackId);
    } catch (error) {
        window.toaster.show({
            message: "Task could not be unarchived",
            intent: Intent.DANGER,
        });
        return;
    }
};

const unarchiveAlert = async (taskId: string) => {
    const result = await Dialog.confirm(
        translate("Unarchive task"),
        translate("Are you sure you want to unarchive this task"),
        Intent.WARNING
    );

    if (!result) return;

    await unarchive(taskId);
};

const duplicate = async ({
    taskId,
    stackId,
    projectId,
    top,
    cover,
    attachments,
    timelogs,
    comments,
    subtasks,
    partialData,
}: {
    taskId: string;
    stackId: string;
    projectId: string;
    top?: boolean;
    cover?: boolean;
    attachments?: boolean;
    timelogs?: boolean;
    comments?: boolean;
    subtasks?: boolean;
    partialData?: Partial<ITask>;
}): Promise<string> => {
    return await TasksAPI.duplicate(taskId, {
        stackId,
        projectId,
        top: top ?? true,
        cover: cover ?? true,
        attachments: attachments ?? true,
        timelogs: timelogs ?? true,
        comments: comments ?? true,
        subtasks: subtasks ?? true,
        partialData,
    });
};

const copy = async () => {
    const options = CopyMoveStore.get();
    const newTaskIds = [];

    if (!options.stack) return false;

    let succeeded = true;

    for (const taskId of options.tasks) {
        const newTaskId = await duplicate({
            taskId,
            stackId: options.stack,
            projectId: options.project!,
            top: !options.after,
            cover: options.cover,
            attachments: options.attachments,
            timelogs: options.timelogs,
            subtasks: options.subtasks,
        });

        if (newTaskId) {
            newTaskIds.push(newTaskId);
        } else {
            succeeded = false;
        }
    }

    const projectId = getCurrentProjectId();

    if (newTaskIds.length > 0 && options.project === projectId) {
        // StacksActions.appendTasks(options.stack, newTaskIds, !options.after);
        console.log("THIS IS MISSING WHEN APPENDING A TASK TO A STACK");

        await loadSegment(newTaskIds);
    }

    return succeeded;
};

const move = async () => {
    const options = CopyMoveStore.get();
    const movedTaskIds = [];

    let succeeded = true;

    for (const taskId of options.tasks) {
        const taskData: Partial<ITask> = {
            stack: options.stack,
            project: options.project,
        };

        console.warn("THIS IS MISSING");
        // if (!options.after) {
        //     taskData.position = 0;
        // } else {
        //     taskData.position = options.project ? getProjectTasks(options.project).length : 0;
        // }

        const updatedTask = await update(taskId, taskData);

        if (updatedTask) {
            movedTaskIds.push(taskId);
        } else {
            succeeded = false;
        }
    }

    return succeeded;
};

const increaseCommentsCount = async (taskId: string) => {
    const task = await getTask(taskId);
    await update(
        taskId,
        {
            comments: task.comments + 1,
        },
        true
    );
};

const exportTask = async (taskId: string, type: string) => {
    const task = await getTask(taskId);
    if (!task) return;

    const fileTitle = kebabCase(stripMd(task.title).substring(0, 30));

    const info: IElectronSaveDialog = await Dialog.showSaveDialog({
        title: "Select export location",
        buttonLabel: translate("Save"),
        defaultPath: `${fileTitle}.${type}`,
        filters: [
            {
                name: fileTitle,
                extensions: [type],
            },
        ],
    });

    if (info.canceled || !info.filePath) return;

    const subtasks = TasksStore.get().tasks.filter(subtask => subtask.parent === task.id);
    const project = await ProjectsActions.getProject(task.project);

    await api("export/task", {
        task,
        subtasks,
        project,
        tags: RecordsStore.get().tags,
        people: PeopleStore.get().people,
        destination: info.filePath,
        type,
    });
};

const togglePrivacy = async (taskId: string) => {
    const task = await getTask(taskId);
    if (!task) return;

    showPermissions(task.permissions, updatedPermissions => {
        updatePermissions(taskId, updatedPermissions);
    });
};

/**
 * Toggling the public option of the task along side the visible people and roles
 * This is mainly used in combination with a remote workspace
 * @param isPublic Boolean
 * @param people String[]
 * @param roles ROLES[]
 * @returns Promise
 */
const updatePermissions = async (taskId: string, permissions: IPermissions) => {
    await PermissionsAPI.update(taskId, permissions);
    await update(taskId, { permissions }, true);
};

const _reopenTasks = async (taskId: string, partialData?: Partial<ITask>) => {
    const task = await getTask(taskId);
    if (!task) return;

    await update(task.id, {
        done: false,
        progress: 0,
        completed: undefined,
        ...partialData,
    });

    await AutomationsActions.run(task.id, AUTOMATION_EVENT.TODO, task.project!);

    const subtasks = getSubtasks(taskId);
    if (subtasks && subtasks.length > 0) {
        for (const subtask of subtasks) {
            await _reopenTasks(subtask.id);
        }
    }
};

const runRepeatAutomation = async (task: ITask): Promise<void> => {
    if (!task.repeats || !task.done || task.archived) return;

    const taskStartDate = task.startdate;
    const taskDueDate = task.duedate;
    const hasStartDate = Boolean(task.startdate);
    const hasDueDate = Boolean(task.duedate);
    const allDayStartDate = hasStartDate && taskStartDate ? taskStartDate.allDay : true;
    const allDayDueDate = hasDueDate && taskDueDate ? taskDueDate.allDay : true;

    // dates gathered from the task
    const startDate = task.startdate ? new Date(task.startdate) : new Date();
    const dueDate = task.duedate ? new Date(task.duedate) : new Date();

    // date that will be used for the newly created task
    let newStartDate: Date = new Date();
    let newDueDate: Date = new Date();

    switch (task.repeats.type) {
        case REPEATTYPE.DAILY:
            newStartDate = hasStartDate && taskStartDate ? addDays(taskStartDate, 1) : addDays(new Date(), 1);
            newDueDate = hasDueDate && taskDueDate ? addDays(taskDueDate, 1) : addDays(new Date(), 1);
            break;
        case REPEATTYPE.WEEKLY:
            const weekDays = task.repeats.value.split(",");
            const currentDay = getDay(new Date());
            const filteredWeekdays = weekDays.filter((day: string) => Number(day) > currentDay);
            if (filteredWeekdays.length) {
                const nextWeekStart = addWeeks(startDate, 1);
                const nextWeekDue = addWeeks(dueDate, 1);
                const targetDay = Number(filteredWeekdays[0]);
                newStartDate = addDays(nextWeekStart, targetDay - getDay(nextWeekStart));
                newDueDate = addDays(nextWeekDue, targetDay - getDay(nextWeekDue));
            } else {
                const nextWeekStart = addWeeks(startDate, 1);
                const nextWeekDue = addWeeks(dueDate, 1);
                const targetDay = Number(weekDays[0]);
                newStartDate = addDays(nextWeekStart, targetDay - getDay(nextWeekStart));
                newDueDate = addDays(nextWeekDue, targetDay - getDay(nextWeekDue));
            }

            break;
        case REPEATTYPE.MONTHLY:
            const diff = differenceInDays(dueDate, startDate);
            const nextMonthDue = addMonths(dueDate, 1);
            const dueMoment =
                task.repeats.value === "last"
                    ? endOfMonth(nextMonthDue)
                    : setDate(nextMonthDue, parseInt(task.repeats.value, 10));
            newDueDate = dueMoment;
            newStartDate = addDays(dueMoment, -diff);
            break;
        case REPEATTYPE.YEARLY:
            newDueDate = addYears(dueDate, 1);
            newStartDate = addYears(startDate, 1);
            break;
        case REPEATTYPE.PERIODICALLY:
            newDueDate = addDays(new Date(), Number(task.repeats.value));
            newStartDate = addDays(new Date(), Number(task.repeats.value));
            break;
    }

    newDueDate.allDay = allDayDueDate;

    return new Promise(resolve => {
        setTimeout(async () => {
            if (task.repeats!.reopen) {
                const taskData: Partial<ITask> = {
                    duedate: newDueDate,
                    repeats: { ...task.repeats! },
                };

                if (hasStartDate) {
                    newStartDate.allDay = allDayStartDate;
                    taskData.startdate = newStartDate;
                }

                await _reopenTasks(task.id, taskData);

                window.toaster.show({
                    message: "Recurring task was reopened with the new dates",
                });
            } else {
                const stack = getStack(task.stack);

                const newTaskId = await duplicate({
                    taskId: task.id,
                    stackId: stack?.id ?? "",
                    projectId: task.project,
                    partialData: {
                        done: false,
                        progress: 0,
                        completed: undefined,
                    },
                });

                if (stack) {
                    // StacksActions.appendTasks(stack.id, [newTaskId]);
                    console.log("THIS IS MISSING WHEN RUNNING THE AUTOMATION - APPENDING A TASK TO A STACK");
                }

                // await loadSegment([newTaskId]);

                const newTask = await getTask(newTaskId);

                const taskData: Partial<ITask> = {
                    ...newTask,
                    done: false,
                    progress: 0,
                    completed: undefined,
                    duedate: newDueDate,
                    repeats: { ...task.repeats! },
                    parent: task.parent,
                };

                if (hasStartDate) {
                    newStartDate.allDay = allDayStartDate;
                    taskData.startdate = newStartDate;
                }

                const updatedTask = await update(newTaskId, taskData);

                // if (task.parent) {
                //     appendSubtask(task.parent, newTaskId);
                // }

                if (stack) {
                    await AutomationsActions.run(
                        newTaskId,
                        AUTOMATION_EVENT.CREATED,
                        taskData.project!,
                        stack.id
                    );
                }

                publish("task:created", { taskId: newTaskId, task: updatedTask });

                window.toaster.show({
                    message: "Recurring task was recreated with the new dates",
                });
            }
            resolve();
        }, 1000);
    });
};

const TaskLog = (task: ITask, update: Partial<ITask>) => {
    for (const field in update) {
        if (field == null) continue;
        if (["updated", "created", "comment"].includes(field)) continue;

        let before = task[field as keyof ITask];
        let after = (update as Partial<ITask>)[field as keyof Partial<ITask>];

        if (field === "description") {
            before = undefined;
            after = undefined;
        }

        if (after == null && before == null) return;

        ActivitiesActions.addActivity({
            resourceId: task.id,
            resourceType: ACTIVITYRESOURCETYPE.TASK,
            type: ACTIVITYTYPE.LOG,
            parent: task.project,
            content: "Task updated",
            change: {
                field,
                before,
                after,
            },
            updated: new Date(),
        });
    }
};

export const TasksActions = {
    update,
    replaceTask,
    loadByProject,
    loadSegment,
    loadPeriod,
    reloadOne,
    reloadTask,
    loadMy,
    loadArchived,
    moveToStack,
    moveTaskWithinStack,
    moveTaskBetweenStacks,
    getCurrent,
    upsertTasks,
    add,
    addMultiple,
    remove,
    removeSelected,
    removeFromList,
    removeMultipleFromList,
    recursivelyRemoveSubtasks,
    alertDelete,
    alertDeleteMultiple,
    attach,
    alertDetach,
    getTask,
    getTasks,
    setTitle,
    toggleDone,
    toggleSelected,
    setDone,
    setTodo,
    setParent,
    setAssignees,
    toggleAssignee,
    assignPerson,
    unassignPerson,
    setDates,
    setStartDate,
    setDueDate,
    setDoDate,
    setCompletedDate,
    setPriority,
    setStatus,
    setProject,
    setTags,
    setDependencies,
    addTag,
    addTags,
    toggleTag,
    removeTags,
    clearTags,
    setProgress,
    setDescription,
    setEstimate,
    setRepeats,
    addLink,
    removeLink,
    updateLink,
    addLocation,
    removeLocation,
    setSubtaskPosition,
    addCover,
    removeCover,
    deleteAttachment,
    setFieldValue,
    setTint,
    setHourlyRate,
    archive,
    archiveAlert,
    unarchive,
    unarchiveAlert,
    copy,
    move,
    increaseCommentsCount,
    exportTask,
    togglePrivacy,
    updatePermissions,
    runRepeatAutomation,
};
