// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * React hook useFilterQuerySync and related helpers.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { ProjectFiltersActions } from "app/store/actions";
import { IFilters, ProjectFiltersStore } from "app/store/projectFilters";
import {
    filtersToSearchParams,
    searchParamsSignature,
    searchParamsToFilters,
    shouldOpenFilterDrawerFromQuery,
} from "app/utils/filterQueryParams";
import { deepEqual } from "./store";

export type MergeProjectFilters = (stored: IFilters | undefined) => IFilters;

/**
 * Keeps task filter state in sync with the URL query string (HashRouter):
 * hydrates the store from the URL before paint and writes merged filters back
 * to the URL after paint.
 * @param options Hook options.
 * @param options.filterStoreKey Key identifying the filter slice in the store.
 * @param options.effectiveDefaults The effective default filters.
 * @param options.getMergedFilters Function producing the merged filters from stored filters.
 * @returns void No return value.
 */
export function useFilterQuerySync(options: {
    filterStoreKey: string;
    effectiveDefaults: IFilters;
    getMergedFilters: MergeProjectFilters;
}) {
    const { filterStoreKey, effectiveDefaults, getMergedFilters } = options;
    const [searchParams, setSearchParams] = useSearchParams();

    const stored = ProjectFiltersStore.use(state => state.filters[filterStoreKey]?.filters, deepEqual);

    const merged = useMemo(() => getMergedFilters(stored), [getMergedFilters, stored]);

    const mergedSig = useMemo(() => JSON.stringify(merged), [merged]);
    const lastWrittenSig = useRef<string | null>(null);

    // URL → store (layout): hydrate from address bar / shared link before paint.
    useLayoutEffect(() => {
        if (!filterStoreKey) return;

        const urlSig = searchParamsSignature(searchParams);

        if (lastWrittenSig.current != null && urlSig === lastWrittenSig.current) {
            return;
        }

        if (urlSig.length === 0) {
            ProjectFiltersActions.reset();
            return;
        }

        const raw = searchParamsToFilters(searchParams);
        const openDrawer = shouldOpenFilterDrawerFromQuery(raw, effectiveDefaults);
        ProjectFiltersActions.setFromQuery(raw, { openDrawer });
    }, [searchParams, filterStoreKey, effectiveDefaults]);

    // Store → URL (after paint): `merged` must reflect store after hydration / UI; avoids same-commit stale `merged`.
    useEffect(() => {
        if (!filterStoreKey) return;

        const next = filtersToSearchParams(merged, effectiveDefaults);
        const nextSig = searchParamsSignature(next);
        const curSig = searchParamsSignature(searchParams);

        if (nextSig === curSig) return;

        lastWrittenSig.current = nextSig;
        setSearchParams(next, { replace: true });
    }, [mergedSig, merged, effectiveDefaults, filterStoreKey, setSearchParams, searchParams]);
}

export type FilterMergeOptions = { projectId?: string; me?: boolean };

/**
 * Builds a stable merge function that merges saved filters over the given
 * defaults, optionally forcing the `project` / `me` flags (stable deps).
 * @param effectiveDefaults The effective default filters.
 * @param options Optional merge options.
 * @param options.projectId Optional project id to force on merged filters.
 * @param options.me Whether to force the `me` flag on merged filters.
 * @returns {MergeProjectFilters} A stable function that merges stored filters.
 */
export function useFilterMerge(
    effectiveDefaults: IFilters,
    options: FilterMergeOptions = {}
): MergeProjectFilters {
    const { projectId, me } = options;
    return useCallback(
        (stored: IFilters | undefined): IFilters => ({
            ...effectiveDefaults,
            ...(stored ?? {}),
            ...(projectId !== undefined ? { project: projectId } : {}),
            ...(me === true ? { me: true as const } : {}),
        }),
        [effectiveDefaults, projectId, me]
    );
}

/**
 * Stable merge helper factory for project routes; always forces the given
 * project id onto the merged filters.
 * @param projectId The project id to force on merged filters.
 * @param effectiveDefaults The effective default filters.
 * @returns {MergeProjectFilters} A stable function that merges stored filters.
 */
export function useProjectFilterMerge(projectId: string, effectiveDefaults: IFilters): MergeProjectFilters {
    return useFilterMerge(effectiveDefaults, { projectId });
}

/**
 * Stable merge helper factory for "My Tasks" routes; always forces the `me` flag.
 * @param effectiveDefaults The effective default filters.
 * @returns {MergeProjectFilters} A stable function that merges stored filters.
 */
export function useMyTasksFilterMerge(effectiveDefaults: IFilters): MergeProjectFilters {
    return useFilterMerge(effectiveDefaults, { me: true });
}

/**
 * Stable merge helper factory for the Inbox route.
 * @param effectiveDefaults The effective default filters.
 * @returns {MergeProjectFilters} A stable function that merges stored filters.
 */
export function useInboxFilterMerge(effectiveDefaults: IFilters): MergeProjectFilters {
    return useFilterMerge(effectiveDefaults, {});
}
