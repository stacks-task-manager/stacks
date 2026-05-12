// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Stack CRUD, reorder, delete with task cascade.
 */
import { translate } from "@stacks/translations";
import { produce } from "immer";
import { Intent } from "@blueprintjs/core";
import {
    INewStack,
    IProject,
    IStack,
    ITask,
    IUpdate,
    POLLINGACTIONS,
    PRIORITY,
    TASKSORTING,
} from "@stacks/types";
import { StacksAPI } from "app/api";
import { Confirm } from "app/components/common";
import { getCurrentProjectId, getProject, getStack, getStackTasks } from "app/hooks";
import { reorderWithAfter } from "app/utils/array";
import Dialog from "app/utils/dialog";
import Log from "app/utils/log";
import type { ReorderResult } from "app/components/draggable/types";
import { CopyMoveStore } from "../copymove";
import { NavigationStore } from "../navigation";
import { IProjectsStore, ProjectsStore } from "../projects";
import { IStacksStore, StacksStore } from "../stacks";
import { TasksStore } from "../tasks";
import { upsertById } from "../actionHelpers";
import { ProjectsActions } from "./projects";
import { TasksActions } from "./tasks";

type IPriorityOrder = {
    [key in PRIORITY]: number;
};

const priorityOrder: IPriorityOrder = {
    [PRIORITY.NONE]: 0,
    [PRIORITY.LOW]: 1,
    [PRIORITY.MEDIUM]: 2,
    [PRIORITY.HIGH]: 3,
    [PRIORITY.CRITICAL]: 4,
};

/**
 * Inserts or updates multiple stacks from the store
 * @param stacks
 */
const upsertStacks = async (stacks: IStack[]) => {
    StacksStore.set(
        produce((state: IStacksStore) => {
            state.stacks = upsertById(state.stacks, stacks);
        })
    );
};

const load = async (projectId: string) => {
    const stacks = await StacksAPI.loadAll(projectId);

    upsertStacks(stacks);
};

const reloadOne = async (update: IUpdate, hasPermission: boolean) => {
    if (hasPermission && update.action === POLLINGACTIONS.UPDATE) {
        const stack = await StacksAPI.load(update.record);
        if (stack) upsertStacks([stack]);
    } else if (!hasPermission || update.action === POLLINGACTIONS.DELETED) {
        StacksStore.set(
            produce((state: IStacksStore) => {
                state.stacks = state.stacks.filter(stack => stack.id !== update.record);
            })
        );
    }
};

const add = async (newStack: INewStack, index?: number) => {
    const stack = await StacksAPI.add(newStack, index);

    StacksStore.set(
        produce((state: IStacksStore) => {
            state.stacks.push(stack);
        })
    );

    ProjectsStore.set(
        produce((state: IProjectsStore) => {
            state.projects = state.projects.map(project => {
                if (project.id === newStack.project) {
                    if (index != null) {
                        project.stacksOrder.splice(index, 0, stack.id);
                    } else {
                        project.stacksOrder = [...project.stacksOrder, stack.id];
                    }
                }

                return project;
            });
        })
    );

    return stack;
};

export const deleteStack = async (stackId: string, onlyTasks?: boolean) => {
    await StacksAPI.delete(stackId, onlyTasks);

    if (onlyTasks) {
        const tasks = getStackTasks(stackId).map(task => task.id);
        await TasksActions.removeMultipleFromList(tasks);
    } else {
        StacksStore.set(
            produce((state: IStacksStore) => {
                state.stacks = state.stacks.filter(stack => stack.id !== stackId);
            })
        );

        ProjectsStore.set(
            produce((state: IProjectsStore) => {
                state.projects = state.projects.map(project => {
                    project.stacksOrder = project.stacksOrder.filter(id => id !== stackId);
                    return project;
                });
            })
        );
    }
};

const alertDelete = (stackId: string) => {
    setTimeout(async () => {
        const { answer, checked } = await Confirm({
            title: "Delete stack",
            description: translate("Are you sure you want to delete this stack All tasks and attachments will also be deleted This action cannot be undone"),
            checkboxLabel: "No, just delete all tasks",
            intent: Intent.DANGER,
        });

        if (answer) {
            await deleteStack(stackId, checked || undefined);
        }
    });
};

const update = async (stackId: string, data: Partial<IStack>, skipAPI?: boolean) => {
    StacksStore.set(
        produce((state: IStacksStore) => {
            state.stacks = state.stacks.map(stack => {
                if (stack.id === stackId) {
                    stack = { ...stack, ...data };
                }

                return stack;
            });
        })
    );

    if (skipAPI) return;
    return await StacksAPI.update(stackId, data);
};

const setTitle = (stackId: string, title: string) => {
    update(stackId, { title });
};

const setTint = (stackId: string, tint: string | undefined) => {
    update(stackId, { tint });
};

const toggleCollapse = (stackId: string) => {
    const stack = getStack(stackId);
    if (!stack) return;
    update(stackId, { collapsed: !stack.collapsed });
};

const collapseStack = (stackId: string) => {
    Log.info("[Store][ProjectsStore]", "collapseStack");
    update(stackId, { collapsed: true });
};

const collapseSelected = () => {
    Log.info("[Store][ProjectsStore]", "collapseSelectedStack");

    const selectedStack = getSelectedStack();
    if (!selectedStack) return;

    collapseStack(selectedStack.id);
};

const uncollapse = (stackId: string) => {
    Log.info("[Store][ProjectsStore]", "uncollapseStack");

    update(stackId, { collapsed: false });
};

const uncollapseSelected = () => {
    const selectedStack = getSelectedStack();
    if (!selectedStack) return;

    update(selectedStack.id, { collapsed: false });
};

const markAllDone = async (stackId: string) => {
    const response = await Dialog.confirm("Mark all done", translate("Are you sure you want to mark all tasks as done"));
    if (!response) return;

    const tasks = getStackTasks(stackId).filter(task => !task.done);
    for (const task of tasks) {
        await TasksActions.setDone(task.id);
    }
};

const markAllToDo = async (stackId: string) => {
    const response = await Dialog.confirm("Mark all done", translate("Are you sure you want to mark all tasks as to do"));
    if (!response) return;

    const tasks = getStackTasks(stackId).filter(task => task.done);
    for (const task of tasks) {
        await TasksActions.setTodo(task.id);
    }
};

const archiveAll = async (stackId: string) => {
    const response = await Dialog.confirm("Archive all tasks", translate("Are you sure you want to archive all tasks"));
    if (!response) return;

    const tasks = getStackTasks(stackId);
    for (const task of tasks) {
        await TasksActions.archive(task.id);
    }
};

const archiveDone = async (stackId: string) => {
    const response = await Dialog.confirm("Archive all completed tasks", translate("Are you sure you want to archive all completed tasks"));
    if (!response) return;

    const tasks = getStackTasks(stackId).filter(task => task.done);
    for (const task of tasks) {
        await TasksActions.archive(task.id);
    }
};

const sortTasks = (tasks: ITask[], sortBy: TASKSORTING) => {
    return [...tasks].sort((a: ITask, b: ITask) => {
        switch (sortBy) {
            case TASKSORTING.TITLEASC:
                if (a.title > b.title) return 1;
                if (a.title < b.title) return -1;
                return 0;
            case TASKSORTING.TITLEDESC:
                if (a.title > b.title) return -1;
                if (a.title < b.title) return 1;
                return 0;
            case TASKSORTING.PRIROITYASC:
                if (
                    (a.priority && b.priority && priorityOrder[a.priority] > priorityOrder[b.priority]) ||
                    (!a.priority && b.priority)
                )
                    return 1;
                if (
                    (a.priority && b.priority && priorityOrder[a.priority] < priorityOrder[b.priority]) ||
                    (a.priority && !b.priority)
                )
                    return -1;
                return 0;
            case TASKSORTING.PRIORITYDESC:
                if (
                    (a.priority && b.priority && priorityOrder[a.priority] > priorityOrder[b.priority]) ||
                    (a.priority && !b.priority)
                )
                    return -1;
                if (
                    (a.priority && b.priority && priorityOrder[a.priority] < priorityOrder[b.priority]) ||
                    (!a.priority && b.priority)
                )
                    return 1;
                return 0;
            case TASKSORTING.DUEDATEASC:
                if (a.duedate && b.duedate && a.duedate > b.duedate) return 1;
                if (a.duedate && b.duedate && a.duedate < b.duedate) return -1;
                if (a.duedate && !b.duedate) return -1;
                if (!a.duedate && b.duedate) return 1;
                return 0;
            case TASKSORTING.DUEDATEDESC:
                if (a.duedate && b.duedate && a.duedate > b.duedate) return -1;
                if (a.duedate && b.duedate && a.duedate < b.duedate) return 1;
                if (a.duedate && !b.duedate) return -1;
                if (!a.duedate && b.duedate) return 1;
                return 0;
            case TASKSORTING.STARTDATEASC:
                const aStartDate = a.startdate;
                const bStartDate = b.startdate;
                if (aStartDate && bStartDate && aStartDate > bStartDate) return 1;
                if (aStartDate && bStartDate && aStartDate < bStartDate) return -1;
                if (a.startdate && !b.startdate) return -1;
                if (!a.startdate && b.startdate) return 1;
                return 0;
            case TASKSORTING.STARTDATEDESC:
                const aStartDateAsc = a.startdate;
                const bStartDateAsc = b.startdate;
                if (aStartDateAsc && bStartDateAsc && aStartDateAsc > bStartDateAsc) return -1;
                if (aStartDateAsc && bStartDateAsc && aStartDateAsc < bStartDateAsc) return 1;
                if (a.startdate && !b.startdate) return -1;
                if (!a.startdate && b.startdate) return 1;
                return 0;
            default:
                return 0;
        }
    });
};

const getSortedTasks = (taskIds: string[], sortBy: TASKSORTING): string[] | null => {
    const { tasks } = TasksStore.get();
    const stackTasks = tasks.filter(task => taskIds.includes(task.id));

    const sortedTasks = sortTasks(stackTasks, sortBy).map(task => task.id);

    return sortedTasks;
};

const orderTasks = async (stackId: string, sortBy?: TASKSORTING) => {
    console.log("THIS SHOULD BE DONE SERVER SIDE");
    return;

    // const stack = getStack(stackId);
    // if (!stack) return;

    // const data: Partial<IStack> = { sorting: sortBy };

    // if (sortBy) {
    //     const sortedTasks = getSortedTasks(stack.tasks, sortBy);

    //     if (sortedTasks === null) return;

    //     data.tasks = sortedTasks;

    //     // window.toaster.show({
    //     //     icon: "info-sign",
    //     //     message: "The tasks order was applied only to the currently visible/filtered tasks.",
    //     // });
    // }

    // update(stackId, data);
};

const setMaxTasks = (stackId: string, maxTasks?: number) => {
    Log.info("[Store][ProjectsStore]", "setStackMaxTasks");

    update(stackId, { maxTasks });
};

const getSelectedStack = (): IStack | undefined => {
    const { stack } = NavigationStore.get();

    if (!stack) return;
    return getStack(stack);
};

const getStackByTask = async (taskId: string): Promise<IStack | undefined> => {
    const task = await TasksActions.getTask(taskId);

    return StacksStore.get().stacks.find((stack: IStack) => stack.id === task.stack);
};

const copy = async () => {
    const projectId = getCurrentProjectId();
    if (!projectId) return false;

    const options = CopyMoveStore.get();
    if (!options.stack) return false;

    const succeeded = await StacksAPI.copyMove(
        "copy",
        options.stack,
        projectId,
        options.project,
        !options.after
    );

    if (projectId === options.project) {
        ProjectsActions.load([projectId]);
    }

    return succeeded;
};

const move = async () => {
    console.log("Moved stack");
    const projectId = getCurrentProjectId();
    if (!projectId) return false;

    const options = CopyMoveStore.get();
    if (!options.stack) return false;

    const succeeded = await StacksAPI.copyMove(
        "move",
        options.stack,
        projectId,
        options.project,
        !options.after
    );

    ProjectsActions.load([projectId]);

    return succeeded;
};

const drop = async ({ itemId, fromIndex, toIndex }: ReorderResult) => {
    if (fromIndex === toIndex) {
        return;
    }

    const projectId = getCurrentProjectId();
    if (!projectId) return;

    const stackId = itemId;
    const project = getProject(projectId);

    const { order: nextOrder, after } = reorderWithAfter(
        project?.stacksOrder || [],
        stackId,
        fromIndex,
        toIndex
    );

    // update the position locally
    ProjectsStore.set(
        produce((state: IProjectsStore) => {
            state.projects = state.projects.map((project: IProject) => {
                if (project.id === projectId) {
                    project.stacksOrder = nextOrder;
                }
                return project;
            });
        })
    );

    await StacksAPI.move(stackId, after);
};

export const StacksActions = {
    load,
    reloadOne,
    getStackByTask,
    getSelectedStack,
    add,
    update,
    deleteStack,
    setTitle,
    alertDelete,
    setMaxTasks,
    orderTasks,
    toggleCollapse,
    setTint,
    markAllDone,
    markAllToDo,
    archiveDone,
    archiveAll,
    uncollapse,
    collapseSelected,
    uncollapseSelected,
    copy,
    move,
    getSortedTasks,
    drop,
};
