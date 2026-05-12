// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * ProjectFilters hooks and selectors.
 */
import { useParams } from "react-router-dom";

import { defaultFilters, IFilters, ProjectFiltersStore } from "app/store/projectFilters";
import { shallowEqual } from "./store";
import { getCurrentProjectId } from "./project";

export const useFilters = (projectId: string): { isVisible: boolean; filters: IFilters } => {
    const filters = ProjectFiltersStore.use(state => state.filters[projectId], shallowEqual);

    if (filters == null) {
        return {
            isVisible: false,
            filters: { ...defaultFilters },
        };
    }

    return filters;
};

/**
 * Returns the current project's filters
 * @returns
 */
export const useProjectFilters = () => {
    const { id } = useParams();
    const filters = useFilters(id ?? "");

    if (id == null) {
        return {
            isVisible: false,
            filters: { ...defaultFilters, project: id },
        };
    }

    return {
        ...filters,
        filters: { ...defaultFilters, ...filters.filters, project: id },
    };
};

/**
 * Returns the current project's filters
 * @returns
 */
export const getProjectFilters = () => {
    const projectId = getCurrentProjectId();

    return {
        ...defaultFilters,
        ...(ProjectFiltersStore.get().filters[projectId]?.filters ?? {}),
        project: projectId,
    };
};

/**
 * Returns the filters for my tasks
 * @returns
 */
export const useMyTasksFilters = () => {
    const filters = useFilters("mytasks");
    return { ...filters, filters: { ...defaultFilters, ...filters.filters, me: true } };
};

/**
 * Returns the filters for the inbox
 * @returns
 */
export const useInboxFilters = () => {
    return useFilters("inbox");
};

/**
 * Returns the attachments query
 * @returns
 */
export const useAttachmentsQuery = () => {
    return ProjectFiltersStore.use(state => state.attachmentsQuery, shallowEqual);
};

/**
 * Returns the links query
 * @returns
 */
export const useLinksQuery = () => {
    return ProjectFiltersStore.use(state => state.linksQuery, shallowEqual);
};

export const useSavedFilters = () => {
    const projectId = getCurrentProjectId();

    return ProjectFiltersStore.use(state => state.savedFilters[projectId] ?? [], shallowEqual);
};
