// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Navigation hooks and selectors.
 */
import { NavigationStore } from "app/store/navigation";
import { strictEqual } from "./store";

export const useTaskNavigation = (taskId: string) => {
    return NavigationStore.use(state => {
        return state.tasks.includes(taskId);
    }, strictEqual);
};

export const useStackNavigation = (stackId: string) => {
    return NavigationStore.use(state => {
        return state.stack === stackId;
    }, strictEqual);
};
