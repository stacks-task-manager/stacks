// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Navigation hooks and selectors.
 */
import { NavigationStore } from "app/store/navigation";
import { strictEqual } from "./store";

/**
 * Returns whether the given task is currently part of the navigation selection.
 * @param {string} taskId - The id of the task to check.
 * @returns True if the task is in the current selection, otherwise false.
 */
export const useTaskNavigation = (taskId: string) => {
    return NavigationStore.use(state => {
        return state.tasks.includes(taskId);
    }, strictEqual);
};

/**
 * Returns whether the given stack is the currently focused navigation stack.
 * @param {string} stackId - The id of the stack to check.
 * @returns True if the stack is the focused one, otherwise false.
 */
export const useStackNavigation = (stackId: string) => {
    return NavigationStore.use(state => {
        return state.stack === stackId;
    }, strictEqual);
};
