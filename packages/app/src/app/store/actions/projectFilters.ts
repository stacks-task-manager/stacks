// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Filter presets read/write.
 */
import { produce } from "immer";

import { createDebouncedCallback } from "../actionHelpers";
import { IFilters, IProjectFiltersStore, ProjectFiltersStore, defaultFilters } from "../projectFilters";
import { StacksStore } from "../stacks";
import { PreferencesStore } from "../preferences";
import { PreferencesAPI } from "app/api";
import type { ParsedFilterQuery } from "app/utils/filterQueryParams";
import { getCurrentProjectId } from "app/hooks";
import { ProjectsStatusStore } from "../projectsStatus";

const ensureFiltersSlot = (projectId: string) => {
    if (ProjectFiltersStore.get().filters[projectId] != null) return;

    const filters = { ...defaultFilters };

    if (projectId !== "mytasks") {
        const defaultStatus = ProjectsStatusStore.get().defaultFilterState[projectId];
        if (Boolean(defaultStatus) && defaultStatus !== "") {
            filters.state = defaultStatus;
        }

        const showSubtasks = ProjectsStatusStore.get().showSubtasks[projectId];
        if (Boolean(showSubtasks)) {
            filters.showSubtasks = showSubtasks;
        }
    }

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.filters[projectId] = {
                isVisible: false,
                filters,
            };
        })
    );
};

const loadSaved = () => {
    const savedFilters = PreferencesStore.get().savedFilters ?? {};

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.savedFilters = savedFilters as IProjectFiltersStore["savedFilters"];
        })
    );
};

const saveFilters = async () => {
    const { savedFilters } = ProjectFiltersStore.get();
    const preferences = PreferencesStore.get();

    PreferencesStore.set({ ...preferences, savedFilters });

    await PreferencesAPI.update(PreferencesStore.get());
};

const addFilter = (filter: IFilters) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            if (state.savedFilters[projectId] == null) {
                state.savedFilters[projectId] = [];
            }
            state.savedFilters[projectId].push(filter);
            state.filters[projectId].filters.id = filter.id;
        })
    );
    void saveFilters();
};

const updateFilter = (updatedFilter: IFilters) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            const list = state.savedFilters[projectId];
            if (list == null) return;
            state.savedFilters[projectId] = list.map(filter => {
                if (filter.id === updatedFilter.id) {
                    return updatedFilter;
                }
                return filter;
            });
        })
    );
    void saveFilters();
};

const deleteFilter = () => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            const list = state.savedFilters[projectId];
            if (list == null) return;
            state.savedFilters[projectId] = list.filter(
                filter => filter.id !== state.filters[projectId].filters.id
            );
        })
    );
    void saveFilters();
    reset();
};

const setTitle = (title: string) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.filters[projectId].filters.title = title;
        })
    );
};

const restoreFilter = (filter: IFilters) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    const { filters } = ProjectFiltersStore.get().filters[projectId];
    if (filters.id === filter.id) return;

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.filters[projectId].filters = filter;
        })
    );
};

const set = (filterKey: keyof IFilters, filterValue: IFilters[keyof IFilters] | null) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    const { filters } = ProjectFiltersStore.get().filters[projectId];
    if (filters[filterKey] === filterValue) return;

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.filters[projectId].filters = {
                ...state.filters[projectId].filters,
                [filterKey]: filterValue,
            };
        })
    );
};

const setMultiple = (values: Partial<IFilters>) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            // TODO: check if the all the passed in filters need updating
            state.filters[projectId].filters = {
                ...state.filters[projectId].filters,
                ...values,
            };
        })
    );
};

const setFromQuery = (
    values: ParsedFilterQuery,
    options?: {
        openDrawer?: boolean;
    }
) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    const { stackId, ...rest } = values;

    const filters = { ...defaultFilters };

    if (projectId !== "mytasks" && projectId !== "inbox") {
        const defaultStatus = ProjectsStatusStore.get().defaultFilterState[projectId];
        if (Boolean(defaultStatus) && defaultStatus !== "") {
            filters.state = defaultStatus;
        }

        const showSubtasks = ProjectsStatusStore.get().showSubtasks[projectId];
        if (Boolean(showSubtasks)) {
            filters.showSubtasks = showSubtasks;
        }
    }

    const openDrawer = options?.openDrawer ?? true;

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            for (const key of Object.keys(rest) as (keyof IFilters)[]) {
                const v = rest[key];
                if (v === undefined) continue;
                if (filters[key] === v) continue;
                Object.assign(filters, { [key]: v });
            }

            if (stackId != null && stackId !== "") {
                const stack = StacksStore.get().stacks.find(s => s.id === stackId);
                filters.stack = stack;
            }

            state.filters[projectId].filters = filters;
            state.filters[projectId].isVisible = openDrawer;
        })
    );
};

const debouncedProjectFilterQuery = createDebouncedCallback(500);
const setQuery = (query: string, cb?: () => void) => {
    debouncedProjectFilterQuery(() => {
        set("query", query);
        if (cb) cb();
    });
};

/**
 * Resets the filters for the current project
 * @returns
 */
const reset = () => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    ensureFiltersSlot(projectId);

    const filters = { ...defaultFilters };

    if (projectId !== "mytasks" && projectId !== "inbox") {
        const defaultStatus = ProjectsStatusStore.get().defaultFilterState[projectId];
        if (Boolean(defaultStatus) && defaultStatus !== "") {
            filters.state = defaultStatus;
        }

        const showSubtasks = ProjectsStatusStore.get().showSubtasks[projectId];
        if (Boolean(showSubtasks)) {
            filters.showSubtasks = showSubtasks;
        }
    }

    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.filters[projectId].filters = filters;
        })
    );
};

/**
 * Toggles the visibility on the current project filters
 * @returns
 */
const toggleShow = (projectId: string) => {
    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            if (state.filters[projectId] == null) {
                state.filters[projectId] = {
                    isVisible: true,
                    filters: { ...defaultFilters },
                };
            } else {
                state.filters[projectId].isVisible = !state.filters[projectId].isVisible;
            }
        })
    );
};

const show = () => {
    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            Object.keys(state.filters).forEach(projectId => {
                state.filters[projectId].isVisible = true;
            });
        })
    );
};

const hide = () => {
    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            Object.keys(state.filters).forEach(projectId => {
                state.filters[projectId].isVisible = false;
            });
        })
    );
};

const getFilters = () => {
    // const { filters } = ProjectFiltersStore.get();
    // const { project } = ProjectStore.get();
    // const { me } = PeopleStore.get();

    // return {
    //     ...filters,
    //     showSubtasks: project?.showSubtasks || false,
    //     currentUser: me,
    // };

    const projectId = getCurrentProjectId();
    if (!projectId) return { ...defaultFilters };

    const { filters } = ProjectFiltersStore.get();
    return filters[projectId] != null ? filters[projectId].filters : { ...defaultFilters };
};

const restore = () => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;

    // return if project filters are already restored
    if (ProjectFiltersStore.get().filters[projectId] != null) return;

    const filters = { ...defaultFilters };

    const defaultStatus = ProjectsStatusStore.get().defaultFilterState[projectId];
    if (Boolean(defaultStatus) && defaultStatus !== "") {
        filters.state = defaultStatus;
    }

    const showSubtasks = ProjectsStatusStore.get().showSubtasks[projectId];
    if (Boolean(showSubtasks)) {
        filters.showSubtasks = showSubtasks;
    } else {
        filters.showSubtasks = false;
    }

    // console.log("query filters", getQueryFilters());

    // set the default filters for the project
    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.filters[projectId] = {
                isVisible: false,
                filters,
            };
        })
    );
};

const setAttachmentsQuery = (query: string) => {
    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.attachmentsQuery = query;
        })
    );
};

const setLinksQuery = (query: string) => {
    ProjectFiltersStore.set(
        produce((state: IProjectFiltersStore) => {
            state.linksQuery = query;
        })
    );
};

export const ProjectFiltersActions = {
    loadSaved,
    addFilter,
    updateFilter,
    restoreFilter,
    deleteFilter,
    setTitle,
    set,
    setMultiple,
    setFromQuery,
    setQuery,
    reset,
    toggleShow,
    show,
    hide,
    getFilters,
    restore,
    setAttachmentsQuery,
    setLinksQuery,
};
