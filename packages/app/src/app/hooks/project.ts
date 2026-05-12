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
 * Returns the current project id
 * @returns
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
 * Returns the index of the project in the ProjectsStore
 * @returns
 */
export const getCurrentProjectIndex = () => {
    const projectId = getCurrentProjectId();
    return ProjectsStore.get().projects.findIndex(project => project.id === projectId);
};

/**
 * Returns the current project based on the id provided in the URL
 * @returns
 */
export const getCurrentProject = () => {
    const projectId = getCurrentProjectId();
    return ProjectsStore.get().projects.find(project => project.id === projectId);
};

/**
 * Returns a secific project based on the provided project id
 * @param projectId
 * @returns
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
 * Returns a secific project based on the provided project id
 * @param projectId
 * @returns
 */
export const getProject = (projectId: string): IProject | undefined => {
    return ProjectsStore.get().projects.find(project => project.id === projectId);
};

/**
 * Returns the current project based on the id provided in the URL
 * @returns
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
 * Returns the current project's background image
 * @returns
 */
export const useProjectBackground = () => {
    const projectId = getCurrentProjectId();
    return ProjectsStore.use(
        state => state.projects.find(project => project.id === projectId)?.backgroundUrl,
        shallowEqual
    );
};

/**
 * Returns the current project's custom fields
 * @returns
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

const checkHasFilters = (filters: IFilters, defaultState: DefaultProjectState, counter?: boolean) => {
    let filterCount = 0;
    if (filters.query.length > 0) filterCount++;
    if (filters.tags.length > 0) filterCount++;
    if (filters.status != null) filterCount++;
    if (filters.stack != null) filterCount++;
    if (filters.priority != null) filterCount++;

    // check if we're inside the inbox or mytasks
    const isProject = !window.location.hash.includes("inbox") && !window.location.hash.includes("mytasks");

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

export const useHasFilters = (counter?: boolean) => {
    const projectId = getCurrentProjectId();
    const defaultState = useProjectDefaultFilterState();

    return ProjectFiltersStore.use(state => {
        if (!state.filters[projectId]) return false;
        const { filters } = state.filters[projectId];
        return checkHasFilters(filters, defaultState, counter);
    }, shallowEqual);
};
