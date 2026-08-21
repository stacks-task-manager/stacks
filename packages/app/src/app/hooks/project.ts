// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Project hooks and selectors.
 */
import { useMemo } from "react";
import { matchPath, useLocation, useParams } from "react-router-dom";

import { IProject } from "@stacks/types";
import { ProjectsActions } from "app/store/actions/projects";
import { IFilters, ProjectFiltersStore } from "app/store/projectFilters";
import { ProjectsStore } from "app/store/projects";
import { DefaultProjectState, ProjectsStatusStore } from "app/store/projectsStatus";
import { useProjectDefaultFilterState } from "./projectStatus";
import { shallowEqual } from "./store";
import { useLoadWhen } from "./useLoadWhen";
import { getHashPathname } from "./router";
import { getTask } from "./tasks";

/**
 * Returns the current project id parsed from the URL hash path.
 * @returns {string} The current project id, "mytasks" when in My Tasks, or "" when no project is active.
 */
export const getCurrentProjectId = () => {
    const path = getHashPathname();

    if (path.includes("mytasks")) {
        return "mytasks";
    }

    const match1 = matchPath("/project/:id", path);
    const match2 = matchPath("/project/:id/:tid", path);
    const match3 = matchPath("/task/:id", path);
    let projectId;
    if (match3?.params.id) {
        const task = getTask(match3.params.id);
        projectId = task?.project;
    }

    return match1?.params.id ?? match2?.params.id ?? projectId ?? "";
};

/**
 * Returns the index of the current project in the ProjectsStore.
 * @returns {number} The index of the current project, or -1 when not found.
 */
export const getCurrentProjectIndex = () => {
    const projectId = getCurrentProjectId();
    return ProjectsStore.get().projects.findIndex(project => project.id === projectId);
};

/**
 * Returns the current project based on the id provided in the URL.
 * @returns {IProject | undefined} The current project, or undefined when not loaded.
 */
export const getCurrentProject = () => {
    const projectId = getCurrentProjectId();
    return ProjectsStore.get().projects.find(project => project.id === projectId);
};

/**
 * Returns a specific project and its loading state, loading it on demand when missing.
 * @param {string} [projectId] The id of the project to load.
 * @returns {{ project: IProject | undefined; isLoading: boolean }} The project (when loaded) and whether it is currently loading.
 */
export const useProject = (projectId?: string): { project: IProject | undefined; isLoading: boolean } => {
    const project = ProjectsStore.use(
        state =>
            state.projects.find(project => {
                return project.id === projectId;
            }),
        shallowEqual
    );

    const { isLoading, isLoaded } = ProjectsStatusStore.use(
        state => ({
            isLoading: state.isLoading[projectId ?? ""] ?? false,
            isLoaded: state.loadedProjects.includes(projectId ?? "--"),
        }),
        shallowEqual
    );

    useLoadWhen(
        !project && !isLoading && !isLoaded && projectId != null,
        () => {
            void ProjectsActions.load([projectId!]);
        },
        [projectId, project, isLoading, isLoaded]
    );

    return {
        isLoading,
        project,
    };
};

/**
 * Returns a specific project based on the provided project id.
 * @param {string} projectId The id of the project.
 * @returns {IProject | undefined} The project, or undefined when not found.
 */
export const getProject = (projectId: string): IProject | undefined => {
    return ProjectsStore.get().projects.find(project => project.id === projectId);
};

/**
 * Returns the current project based on the id provided in the URL.
 * @returns {{ project: IProject | undefined; isLoading: boolean }} The current project and its loading state.
 */
export const useCurrentProject = () => {
    const { id } = useParams();
    const { state } = useLocation();

    const projectId = useMemo(() => {
        if (state && state.backgroundLocation) {
            const match = matchPath("/project/:id", state.backgroundLocation.pathname);
            return match?.params.id;
        }
        return id;
    }, [id, state]);

    return useProject(projectId);
};

/**
 * Returns the current project's background image.
 * @returns {string | undefined} The URL of the background image, or undefined.
 */
export const useProjectBackground = () => {
    const projectId = getCurrentProjectId();
    return ProjectsStore.use(
        state => state.projects.find(project => project.id === projectId)?.backgroundUrl,
        shallowEqual
    );
};

/**
 * Returns the current project's custom fields.
 * @param {string} projectId The id of the project whose fields to return.
 * @returns {IField[]} The project's custom fields, or an empty array when unavailable.
 */
export const useProjectFields = (projectId: string) => {
    return (
        ProjectsStore.use(
            state => state.projects.find(project => project.id === projectId)?.fields,
            shallowEqual
        ) ?? []
    );
};

// export const useFilteredProject = (): [IProject | null, boolean] => {
//     const { project, isLoading } = ProjectStore.use(
//         state => ({
//             project: state.project,
//             isLoading: state.isLoading,
//         }),
//         shallowEqual
//     );

//     if (!project || isLoading) return [null, isLoading];
//     return [
//         produce(project, draftProject => {
//             draftProject.stacks = draftProject.stacks.map((stack: IStack) => {
//                 return stack;
//             });
//         }),
//         false,
//     ];
// };

// export const useFilteredProjectId = (): string | null => {
//     return ProjectStore.use(state => {
//         return state.project?.id || null;
//     }, strictEqual);
// };

// export const getFilteredProject = () => {
//     const { project } = ProjectStore.get();
//     if (!project) return null;
//     return produce(project, draftProject => {
//         draftProject.stacks = draftProject.stacks.map((stack: IStack) => {
//             return stack;
//         });
//     });
// };

/**
 * Counts how many filters are active for a project and whether any are set.
 * @param {IFilters} filters The active filter values.
 * @param {DefaultProjectState} defaultState The project's default filter state.
 * @param {boolean} [counter] When true, returns the exact active filter count instead of a boolean.
 * @returns {boolean | number} Whether any filter is active, or the active filter count when counter is set.
 */
const checkHasFilters = (filters: IFilters, defaultState: DefaultProjectState, counter?: boolean) => {
    let filterCount = 0;
    if (filters.query.length > 0) filterCount++;
    if (filters.tags.length > 0) filterCount++;
    if (filters.status != null) filterCount++;
    if (filters.stack != null) filterCount++;
    if (filters.priority != null) filterCount++;

    // check if we're inside the inbox or mytasks
    const currentPath = getHashPathname();
    const isProject = !currentPath.includes("inbox") && !currentPath.includes("mytasks");

    if (isProject && Boolean(defaultState)) {
        if (filters.state !== defaultState) filterCount++;
    } else {
        if (filters.state !== "todo") filterCount++;
    }

    if (filters.assignees.length > 0) filterCount++;
    if (filters.startDate != null) filterCount++;
    if (filters.doDate != null) filterCount++;
    if (filters.dueDate != null) filterCount++;
    if (filters.overdue === true) filterCount++;
    if (filters.inProgress === true) filterCount++;
    if (filters.me != null) filterCount++;
    if (filters.nobody === true) filterCount++;
    if (filters.skipMe === true) filterCount++;
    if (filters.onlyAssigned === true) filterCount++;

    return counter ? filterCount : filterCount > 0;
};

/**
 * Returns whether the current project has any active filters.
 * @param {boolean} [counter] When true, returns the exact active filter count instead of a boolean.
 * @returns {boolean | number} Whether any filter is active, or the active filter count when counter is set.
 */
export const useHasFilters = (counter?: boolean) => {
    const projectId = getCurrentProjectId();
    const defaultState = useProjectDefaultFilterState();

    return ProjectFiltersStore.use(state => {
        if (!state.filters[projectId]) return false;
        const { filters } = state.filters[projectId];
        return checkHasFilters(filters, defaultState, counter);
    }, shallowEqual);
};
