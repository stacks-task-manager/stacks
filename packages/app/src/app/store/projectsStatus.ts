// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Project status filter toggles.
 */
import { produce } from "immer";

import { entity } from "app/hooks/store";
import { PROJECTVIEW } from "@stacks/types";
import { getStorage } from "app/utils/storage";

export const PROJECT_LAST_VIEW_TYPES = "project-last-view-types";
export const PROJECT_ACTIVE_VIEWS = "project-active-views";
export const PROJECT_DEFAULT_STACK = "project-default-stack";
export const PROJECT_DEFAULT_VIEW = "project-default-view";
export const PROJECT_DEFAULT_FILTER = "project-default-filter";
export const PROJECT_SHOW_SUBTASKS = "project-show-subtasks";

interface ProjectShowSubtasks {
    [id: string]: boolean;
}

interface ProjectLastViewType {
    [id: string]: PROJECTVIEW;
}

interface ProjectLoading {
    [id: string]: boolean;
}

interface ProjectActiveView {
    [id: string]: PROJECTVIEW[];
}

interface ProjectDefaultStack {
    [id: string]: string | undefined;
}

interface ProjectDefaultView {
    [id: string]: PROJECTVIEW;
}

export type DefaultProjectState = "" | "all" | "done" | "todo";

interface ProjectDefaultFilterState {
    [id: string]: DefaultProjectState;
}

export interface IProjectsStatusStore {
    isLoading: ProjectLoading;
    loadedProjects: string[];
    lastViewTypes: ProjectLastViewType;
    activeViews: ProjectActiveView;
    isShowingSettings: boolean;
    defaultStack: ProjectDefaultStack;
    defaultView: ProjectDefaultView;
    showSubtasks: ProjectShowSubtasks;
    defaultFilterState: ProjectDefaultFilterState;
}

export const ProjectsStatusStore = entity<IProjectsStatusStore>(
    {
        isLoading: {},
        loadedProjects: [],
        lastViewTypes: {},
        activeViews: {},
        isShowingSettings: false,
        defaultStack: {},
        defaultView: {},
        showSubtasks: {},
        defaultFilterState: {},
    },
    [
        {
            init: (origInit, entity) => () => {
                origInit();
                const lastViewTypes = getStorage(PROJECT_LAST_VIEW_TYPES, true, {});
                const activeViews = getStorage(PROJECT_ACTIVE_VIEWS, true, {});
                const defaultStack = getStorage(PROJECT_DEFAULT_STACK, true, {});
                const defaultView = getStorage(PROJECT_DEFAULT_VIEW, true, {});
                const defaultFilterState = getStorage(PROJECT_DEFAULT_FILTER, true, {});
                const showSubtasks = getStorage(PROJECT_SHOW_SUBTASKS, true, {});

                entity.set(
                    produce((state: IProjectsStatusStore) => {
                        state.lastViewTypes = lastViewTypes;
                        state.activeViews = activeViews;
                        state.defaultStack = defaultStack;
                        state.defaultView = defaultView;
                        state.defaultFilterState = defaultFilterState;
                        state.showSubtasks = showSubtasks;
                    })
                );
            },
        },
    ]
);
