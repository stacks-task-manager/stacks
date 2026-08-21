// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * ProjectFilters hooks and selectors.
 */
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { defaultFilters, IFilters, ProjectFiltersStore } from "app/store/projectFilters";
import { shallowEqual } from "./store";
import { getCurrentProjectId } from "./project";

/**
 * Returns the current filters and visibility state for the given project.
 * Falls back to the default filters when no filters are stored for that project.
 * @param projectId The id of the project (or a special scope such as "mytasks" / "inbox") to read filters for.
 * @returns An object with `isVisible` and the project's `filters`.
 */
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
 * Returns the filters for the current project based on the URL, with the current project id injected.
 * @returns An object with `isVisible` and the project's `filters`, including the current `project` id.
 */
export const useProjectFilters = () => {
    const { id } = useParams();
    const filters = useFilters(id ?? "");

    return useMemo(() => {
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
    }, [id, filters]);
};

/**
 * Returns the current project's filters, read synchronously from the store.
 * Merges the stored filters over the defaults and sets `project` to the current project id.
 * @returns The merged `IFilters` for the current project.
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
 * Returns the filters for the "mytasks" scope, with `me: true` applied.
 * @returns An object with `isVisible` and the mytasks `filters`.
 */
export const useMyTasksFilters = () => {
    const filters = useFilters("mytasks");
    return useMemo(
        () => ({ ...filters, filters: { ...defaultFilters, ...filters.filters, me: true } }),
        [filters]
    );
};

/**
 * Returns the filters for the "inbox" scope.
 * @returns An object with `isVisible` and the inbox `filters`.
 */
export const useInboxFilters = () => {
    return useFilters("inbox");
};

/**
 * Returns the current attachments query string.
 * @returns The attachments search query.
 */
export const useAttachmentsQuery = () => {
    return ProjectFiltersStore.use(state => state.attachmentsQuery, shallowEqual);
};

/**
 * Returns the current links query string.
 * @returns The links search query.
 */
export const useLinksQuery = () => {
    return ProjectFiltersStore.use(state => state.linksQuery, shallowEqual);
};

/**
 * Returns the saved filters for the current project.
 * @returns The array of saved `IFilters` for the current project (empty when none exist).
 */
export const useSavedFilters = () => {
    const projectId = getCurrentProjectId();

    return ProjectFiltersStore.use(state => state.savedFilters[projectId] ?? [], shallowEqual);
};
