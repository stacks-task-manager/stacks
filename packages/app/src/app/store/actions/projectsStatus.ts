// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Per-project health/status chips.
 */
import { Intent } from "@blueprintjs/core";
import { produce } from "immer";
import xor from "lodash/xor";

import { PROJECT_DEFAULT_VIEWS, PROJECTVIEW } from "@stacks/types";
import {
    DefaultProjectState,
    IProjectsStatusStore,
    PROJECT_ACTIVE_VIEWS,
    PROJECT_DEFAULT_FILTER,
    PROJECT_DEFAULT_STACK,
    PROJECT_DEFAULT_VIEW,
    PROJECT_LAST_VIEW_TYPES,
    PROJECT_SHOW_SUBTASKS,
    ProjectsStatusStore,
} from "../projectsStatus";
import { setStorage } from "app/utils/storage";
import { getCurrentProjectId } from "app/hooks";

/**
 * Toggles the visibility of a view type in the toolbar tabs for a specific project
 * Then saves all of them into the local storage
 * @param projectId
 * @param view
 */
const setToggleViewVisibility = (view: PROJECTVIEW) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;
    const { activeViews } = ProjectsStatusStore.get();

    const views = xor(activeViews[projectId] ?? [...PROJECT_DEFAULT_VIEWS], [view]);

    // if the user has deselected all the views
    // we're enforcing to have at least one
    // enabling the board view
    if (!views.length) {
        const defaultView = ProjectsStatusStore.get().defaultView[projectId];

        // set either the user's prefered view or the board view
        views.push(defaultView && defaultView !== PROJECTVIEW.DEFAULT ? defaultView : PROJECTVIEW.BOARD);
        window.toaster.show({
            message: "At least one view should remain visible",
            intent: Intent.WARNING,
        });
    }

    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            state.activeViews[projectId] = views;
        })
    );

    // save the views to local storage
    setStorage(PROJECT_ACTIVE_VIEWS, ProjectsStatusStore.get().activeViews);
};

/**
 * Sets the current view type per project (e.g. Board, List view, table etc)
 * Then saves them into the local storage
 * @param projectId
 * @param view
 * @returns
 */
const setCurrentView = (view: PROJECTVIEW) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;
    const { lastViewTypes } = ProjectsStatusStore.get();

    // skip updating the store if the current active view for the requested project is the same
    if (lastViewTypes[projectId] && lastViewTypes[projectId] === view) return;

    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            state.lastViewTypes[projectId] = view;
        })
    );

    // save the views to local storage
    setStorage(PROJECT_LAST_VIEW_TYPES, ProjectsStatusStore.get().lastViewTypes);
};

/**
 * Returns wether a specific project is loading or not
 * @param projectId
 * @returns
 */
const isLoading = (projectId: string) => {
    const { isLoading } = ProjectsStatusStore.get();
    return Boolean(isLoading[projectId]);
};

/**
 * Sets wether a speicif project is loading or not
 * @param projectIds
 * @param loading
 */
const setLoading = (projectIds: string[], loading: boolean) => {
    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            for (const projectId of projectIds) {
                state.isLoading[projectId] = loading;
                // if the loading stopped for the passed in projects then mark them as loaded
                if (!loading && !state.loadedProjects.includes(projectId)) {
                    state.loadedProjects.push(projectId);
                }
            }
        })
    );
};

/**
 * Returns wether the projects are loading or not
 * @returns
 */
const loadingProjects = () => {
    return Object.keys(ProjectsStatusStore.get().isLoading);
};

/**
 * Returns the list of loaded projects
 * @returns
 */
const loadedProjects = () => {
    return ProjectsStatusStore.get().loadedProjects;
};

/**
 * Toggles the visibility of the current project
 */
const toggleSettingsVisibility = () => {
    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            state.isShowingSettings = !state.isShowingSettings;
        })
    );
};

const setDefaultView = async (defaultView: PROJECTVIEW) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            state.defaultView[projectId] = defaultView;
        })
    );

    setStorage(PROJECT_DEFAULT_VIEW, ProjectsStatusStore.get().defaultView);
};

const setFilterState = async (defaultState: DefaultProjectState) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            if (defaultState === "") {
                delete state.defaultFilterState[projectId];
            } else {
                state.defaultFilterState[projectId] = defaultState;
            }
        })
    );

    setStorage(PROJECT_DEFAULT_FILTER, ProjectsStatusStore.get().defaultFilterState);
};

const setShowSubtasks = async (showSubtasks: boolean) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            state.showSubtasks[projectId] = showSubtasks;
        })
    );

    setStorage(PROJECT_SHOW_SUBTASKS, ProjectsStatusStore.get().showSubtasks);
};

const setDefaultStack = async (stackId?: string) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ProjectsStatusStore.set(
        produce((state: IProjectsStatusStore) => {
            state.defaultStack[projectId] = stackId;
        })
    );

    setStorage(PROJECT_DEFAULT_STACK, ProjectsStatusStore.get().defaultStack);
};

export const ProjectsStatusActions = {
    setToggleViewVisibility,
    setCurrentView,
    isLoading,
    setLoading,
    loadingProjects,
    loadedProjects,
    toggleSettingsVisibility,
    setDefaultView,
    setFilterState,
    setShowSubtasks,
    setDefaultStack,
};
