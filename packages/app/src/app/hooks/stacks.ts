// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Stacks hooks and selectors.
 */
import { useMemo } from "react";

import { IStack, ITask } from "@stacks/types";
import { StacksStore } from "app/store/stacks";
import { getCurrentProject, getProject, useCurrentProject, useProject } from "./project";
import { shallowEqual } from "./store";
import { useStackTasks } from "./tasks";

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
    const { project, isLoading } = useCurrentProject();
    const stacksOrder = project?.stacksOrder ?? [];

    return StacksStore.use(state => {
        if (isLoading || !project) return [];
        return orderedStacksForProject(state.stacks, project.id, stacksOrder);
    }, shallowEqual);
};

/** * Returns the stacks of the current project.
 * @returns {IStack[]} Array of stacks.
 */
export const getStacks = (): IStack[] => {
    const project = getCurrentProject();
    return StacksStore.get().stacks?.filter(stack => stack.project === project?.id) ?? [];
};

export const useStacksIds = () => {
    const stacks = useStacks();
    return stacks.map((stack: IStack) => stack.id);
};

export const useStack = (stackId?: string): IStack | undefined => {
    const { stacks } = StacksStore.use();
    return stacks.find(stack => stack.id === stackId);
};

/**
 * Returns the stack with the given id.
 * @param stackId Stack id.
 * @returns {IStack | undefined} Stack.
 */
export const getStack = (stackId: string): IStack | undefined => {
    return StacksStore.get().stacks.find(stack => stack.id === stackId);
};

export const useProjectStacks = (projectId?: string): IStack[] => {
    const { project, isLoading } = useProject(projectId);
    const stacksOrder = project?.stacksOrder ?? [];

    return StacksStore.use(state => {
        if (isLoading || !project || projectId == null || project.id !== projectId) return [];
        return orderedStacksForProject(state.stacks, projectId, stacksOrder);
    }, shallowEqual);
};

/** @deprecated Prefer {@link useStacks} (same behavior: respects project loading state). */
export const useCurrentProjectStacks = useStacks;

export const useStacksTaskOrders = () => {
    const stacks = useStacks();
    return useMemo(() => {
        return stacks.reduce<Record<string, string[]>>((acc, stack: IStack) => {
            acc[stack.id] = stack.tasksOrder ?? [];
            return acc;
        }, {});
    }, [stacks]);
};

export const getProjectStacks = (projectId: string): IStack[] => {
    const project = getProject(projectId);
    if (!project) return [];
    return orderedStacksForProject(StacksStore.get().stacks, projectId, project.stacksOrder ?? []);
};

export const useStackInfo = (stackId: string) => {
    const stack = useStack(stackId);
    const tasks = useStackTasks(stackId);

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

export const useStackMenu = (stackId: string) => {
    const stack = useStack(stackId);
    const tasks = useStackTasks(stackId);

    return useMemo(() => {
        if (!stack) return null;

        const stackInfo = {
            title: stack.title,
            progress: 0,
            limit: false,
            completedCount: tasks.filter((task: ITask) => task.done).length,
            uncompleteCount: tasks.filter((task: ITask) => !task.done).length,
            tasksCount: tasks.length,
            maxTasks: stack.maxTasks || 0,
            tint: stack.tint,
            sorting: stack.sorting,
        };

        const total = tasks.reduce((current: number, task: ITask) => {
            return current + (task.progress || 0);
        }, 0);

        if (stack.maxTasks) {
            stackInfo.limit = stackInfo.uncompleteCount > stack.maxTasks;
        }

        stackInfo.progress = Math.ceil(total / tasks.length);

        return stackInfo;
    }, [stack, tasks]);
};
