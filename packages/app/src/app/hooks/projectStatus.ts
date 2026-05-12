// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * ProjectStatus hooks and selectors.
 */
import { useParams } from "react-router-dom";

import { ProjectsStatusStore } from "app/store/projectsStatus";
import { shallowEqual } from "./store";
import { PROJECT_DEFAULT_VIEWS, PROJECTVIEW } from "@stacks/types";
import { getProjectStacks } from "./stacks";

/**
 * Returns the current project's active views
 * @returns
 */
export const useProjectActiveViews = () => {
    const { id } = useParams();

    const { activeViews, defaultView } = ProjectsStatusStore.use(
        state => ({
            activeViews: state.activeViews[id!] ?? [...PROJECT_DEFAULT_VIEWS],
            defaultView: state.defaultView[id!] ?? PROJECTVIEW.BOARD,
        }),
        shallowEqual
    );

    if (!activeViews.length) {
        return [defaultView];
    }

    return activeViews ?? PROJECT_DEFAULT_VIEWS;
};

/**
 * Returns wether the settings should be visible or not
 * @returns
 */
export const useProjectShowingSettings = () => {
    return ProjectsStatusStore.use(state => state.isShowingSettings, shallowEqual);
};

export const useDefaultStackForProject = (projectId?: string) => {
    return ProjectsStatusStore.use(state => state.defaultStack[projectId ?? ""], shallowEqual);
};

export const getDefaultStackForProject = (projectId: string): string | undefined => {
    const defaultStack = ProjectsStatusStore.get().defaultStack[projectId];
    if (defaultStack) {
        return defaultStack;
    }

    const stacks = getProjectStacks(projectId);
    if (stacks.length) {
        return stacks[0].id;
    }

    return undefined;
};

/**
 * Returns the current project's loading state
 * @returns
 */
export const useProjectStatus = (): {
    isLoading: boolean;
    isLoaded: boolean;
    projectId: string | undefined;
} => {
    const { id } = useParams();
    const { isLoading, isLoaded } = ProjectsStatusStore.use(
        state => ({
            isLoading: state.isLoading[id!],
            isLoaded: state.loadedProjects.includes(id!),
        }),
        shallowEqual
    );
    return {
        isLoading: id == null ? true : Boolean(isLoading),
        isLoaded: id == null ? false : isLoaded,
        projectId: id,
    };
};

/**
 * Returns the current project's default view
 * @returns
 */
export const useProjectDefaultView = () => {
    const { id } = useParams();
    return ProjectsStatusStore.use(state => state.defaultView[id!], shallowEqual) ?? PROJECTVIEW.DEFAULT;
};

/**
 * Returns the current project's last used view type
 * @returns
 */
export const useProjectLastView = () => {
    const { id } = useParams();

    return ProjectsStatusStore.use(state => state.lastViewTypes[id!] ?? PROJECTVIEW.BOARD, shallowEqual);
};

export const getProjectLastView = (id: string) => {
    return ProjectsStatusStore.get().lastViewTypes[id] ?? PROJECTVIEW.BOARD;
};

/**
 * Returns the default filtering state set in Project Settings
 * "" | "all" | "done" | "todo"
 */
export const useProjectDefaultFilterState = () => {
    const { id } = useParams();
    return ProjectsStatusStore.use(state => state.defaultFilterState[id!], shallowEqual);
};

export const useProjectShowSubtasks = () => {
    const { id } = useParams();
    return ProjectsStatusStore.use(state => state.showSubtasks[id!], shallowEqual);
};
