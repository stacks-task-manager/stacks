// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Normalized tasks map and board state.
 */
import { Plugin, entity } from "app/hooks/store";
import { ITask } from "@stacks/types";

export interface ITasksStore {
    isLoading: boolean;
    loadingChunk: string[]; // used to indentify which tasks are loading
    tasks: ITask[];
    tasksById: ReadonlyMap<string, ITask>;
    taskIdsByProject: ReadonlyMap<string, readonly string[]>;
    taskIdsByStack: ReadonlyMap<string, readonly string[]>;
    subtaskIdsByParent: ReadonlyMap<string, readonly string[]>;
    loadedProjects: string[];
    isLoadingArchived: boolean;
}

type StringListIndex = ReadonlyMap<string, readonly string[]>;

const appendIndexedId = (index: Map<string, string[]>, key: string | null, taskId: string) => {
    if (!key) return;
    const ids = index.get(key);
    if (ids) ids.push(taskId);
    else index.set(key, [taskId]);
};

const buildTaskIndexes = (tasks: ITask[]) => {
    const tasksById = new Map<string, ITask>();
    const taskIdsByProject = new Map<string, string[]>();
    const taskIdsByStack = new Map<string, string[]>();
    const subtaskIdsByParent = new Map<string, string[]>();

    for (const task of tasks) {
        tasksById.set(task.id, task);
        appendIndexedId(taskIdsByProject, task.project, task.id);
        appendIndexedId(taskIdsByStack, task.stack, task.id);
        appendIndexedId(subtaskIdsByParent, task.parent, task.id);
    }

    return { tasksById, taskIdsByProject, taskIdsByStack, subtaskIdsByParent };
};

/**
 * Resolves ordered ids first, then appends any indexed ids omitted by stale or partial order data.
 */
export function orderTasksWithFallback(
    tasksById: ReadonlyMap<string, ITask>,
    orderedIds: readonly string[],
    fallbackIds: readonly string[] = []
): ITask[] {
    const seen = new Set<string>();
    const tasks: ITask[] = [];

    for (const taskId of [...orderedIds, ...fallbackIds]) {
        if (seen.has(taskId)) continue;
        seen.add(taskId);
        const task = tasksById.get(taskId);
        if (task) tasks.push(task);
    }

    return tasks;
}

const maintainTaskIndex: Plugin = {
    set: origSet => (valueOrUpdaterFn, alias) => {
        const current = TasksStore.get();
        const nextValue =
            typeof valueOrUpdaterFn === "function" ? valueOrUpdaterFn(current) : valueOrUpdaterFn;
        const indexes =
            current.tasks === nextValue.tasks
                ? {
                      tasksById: current.tasksById,
                      taskIdsByProject: current.taskIdsByProject,
                      taskIdsByStack: current.taskIdsByStack,
                      subtaskIdsByParent: current.subtaskIdsByParent,
                  }
                : buildTaskIndexes(nextValue.tasks);

        origSet(
            () => ({
                ...nextValue,
                ...indexes,
            }),
            alias
        );
    },
};

const emptyStringListIndex: StringListIndex = new Map();

export const TasksStore = entity<ITasksStore>(
    {
        isLoading: false,
        loadingChunk: [],
        tasks: [],
        tasksById: new Map(),
        taskIdsByProject: emptyStringListIndex,
        taskIdsByStack: emptyStringListIndex,
        subtaskIdsByParent: emptyStringListIndex,
        loadedProjects: [],
        isLoadingArchived: false,
    },
    [maintainTaskIndex]
);
