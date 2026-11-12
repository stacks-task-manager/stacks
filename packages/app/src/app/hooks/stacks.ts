// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Stacks hooks and selectors.
 */
import { useMemo } from "react";

import { IStack } from "@stacks/types";
import { StacksStore } from "app/store/stacks";
import { getCurrentProject, getProject, useCurrentProjectValue, useProjectValue } from "./project";
import { shallowEqual } from "./store";
import { useStackTasksFromStack } from "./tasks";

/**
 * Returns the stacks of a project sorted in the given order.
 * @param {IStack[]} allStacks All stacks across projects.
 * @param {string} projectId The id of the project to filter stacks for.
 * @param {string[]} stacksOrder The desired order of stack ids.
 * @returns {IStack[]} The project's stacks sorted by stacksOrder.
 */
export function orderedStacksForProject(
    allStacks: IStack[],
    projectId: string,
    stacksOrder: string[]
): IStack[] {
    return allStacks
        .filter(stack => stack.project === projectId)
        .sort((a, b) => stacksOrder.indexOf(a.id) - stacksOrder.indexOf(b.id));
}

/**
 * Custom hook to get the stacks of the current project.
 * @returns {IStack[]} Array of stacks.
 */
export const useStacks = (): IStack[] => {
    const project = useCurrentProjectValue(
        project => ({ id: project.id, stacksOrder: project.stacksOrder ?? [] }),
        shallowEqual
    );

    return StacksStore.use(state => {
        if (!project) return [];
        return orderedStacksForProject(state.stacks, project.id, project.stacksOrder);
    }, shallowEqual);
};

/**
 * Returns the stacks of the current project.
 * @returns {IStack[]} Array of stacks.
 */
export const getStacks = (): IStack[] => {
    const project = getCurrentProject();
    return StacksStore.get().stacks?.filter(stack => stack.project === project?.id) ?? [];
};

/**
 * Returns the ids of the current project's stacks.
 * @returns {string[]} The ids of the current project's stacks.
 */
export const useStacksIds = () => {
    const stacks = useStacks();
    return useMemo(() => stacks.map((stack: IStack) => stack.id), [stacks]);
};

/**
 * Returns the stack with the given id.
 * @param {string} [stackId] The id of the stack.
 * @returns {IStack | undefined} The stack, or undefined when not found.
 */
export const useStack = (stackId?: string): IStack | undefined => {
    return StacksStore.use(
        state => (stackId ? state.stacks.find(stack => stack.id === stackId) : undefined),
        shallowEqual
    );
};

/**
 * Returns the stack with the given id.
 * @param {string} stackId Stack id.
 * @returns {IStack | undefined} The stack, or undefined when not found.
 */
export const getStack = (stackId: string): IStack | undefined => {
    return StacksStore.get().stacks.find(stack => stack.id === stackId);
};

/**
 * Returns the stacks of a project in their configured order.
 * @param {string} [projectId] The id of the project.
 * @returns {IStack[]} The project's stacks, or an empty array when not loaded.
 */
export const useProjectStacks = (projectId?: string): IStack[] => {
    const project = useProjectValue(
        projectId,
        project => ({ id: project.id, stacksOrder: project.stacksOrder ?? [] }),
        shallowEqual
    );

    return StacksStore.use(state => {
        if (!project || projectId == null || project.id !== projectId) return [];
        return orderedStacksForProject(state.stacks, projectId, project.stacksOrder);
    }, shallowEqual);
};

/** @deprecated Prefer {@link useStacks} (same behavior: respects project loading state). */
export const useCurrentProjectStacks = useStacks;

/**
 * Returns a map of stack id to its ordered task ids for the current project.
 * @returns {Record<string, string[]>} Mapping of stack id to its task order.
 */
export const useStacksTaskOrders = () => {
    const stacks = useStacks();
    return useMemo(() => {
        return stacks.reduce<Record<string, string[]>>((acc, stack: IStack) => {
            acc[stack.id] = stack.tasksOrder ?? [];
            return acc;
        }, {});
    }, [stacks]);
};

/**
 * Returns the stacks of a project in their configured order.
 * @param {string} projectId The id of the project.
 * @returns {IStack[]} The project's stacks, or an empty array when the project is not found.
 */
export const getProjectStacks = (projectId: string): IStack[] => {
    const project = getProject(projectId);
    if (!project) return [];
    return orderedStacksForProject(StacksStore.get().stacks, projectId, project.stacksOrder ?? []);
};

/**
 * Returns display information about a stack and its tasks.
 * @param {string} stackId The id of the stack.
 * @returns {{ collapsed: boolean; empty: boolean; tint: string | undefined; tasks: ITask[]; title: string } | null} Stack display info, or null when the stack is not found.
 */
export const useStackInfo = (stackId: string) => {
    const stack = useStack(stackId);
    const tasks = useStackTasksFromStack(stack);

    return useMemo(() => {
        if (!stack) return null;

        const stackInfo = {
            collapsed: Boolean(stack.collapsed),
            // sorting: stack.sorting,
            empty: tasks.length === 0,
            // tag: stack.tag ? stack.tag.color : null,
            tint: stack.tint,
            tasks,
            title: stack.title,
            // tasks: filterTasks(stack.tasks, filters, stack, hideCompletedTasks!).map(
            //     (task: ITask) => task.id
            // ),
        };

        return stackInfo;
    }, [stack, tasks]);
};

/**
 * Returns menu display information about a stack and its task progress.
 * @param {string} stackId The id of the stack.
 * @returns {{ title: string; progress: number; limit: boolean; completedCount: number; uncompleteCount: number; tasksCount: number; maxTasks: number; tint: string | undefined; sorting: TASKSORTING | undefined } | null} Stack menu info, or null when the stack is not found.
 */
export const useStackMenu = (stackId: string) => {
    const stack = useStack(stackId);
    const tasks = useStackTasksFromStack(stack);

    return useMemo(() => {
        if (!stack) return null;

        let completedCount = 0;
        let total = 0;
        for (const task of tasks) {
            if (task.done) completedCount++;
            total += task.progress || 0;
        }

        const uncompleteCount = tasks.length - completedCount;
        const maxTasks = stack.maxTasks || 0;

        return {
            title: stack.title,
            progress: tasks.length ? Math.ceil(total / tasks.length) : 0,
            limit: Boolean(maxTasks && uncompleteCount > maxTasks),
            completedCount,
            uncompleteCount,
            tasksCount: tasks.length,
            maxTasks,
            tint: stack.tint,
            sorting: stack.sorting,
        };
    }, [stack, tasks]);
};
