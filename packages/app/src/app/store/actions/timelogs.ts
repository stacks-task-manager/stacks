// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelog create/update/delete flows.
 */
import { produce } from "immer";

import { ITimeLog, IUpdate } from "@stacks/types";
import { TimelogsAPI, TimelogsFilterParams } from "app/api/timelogs";
import Storage from "app/utils/storage";
import { createDebouncedCallback, patchFilterField, upsertById } from "../actionHelpers";
import { ITimelogsFilters, ITimelogsStore, TimelogsStore } from "../timelogs";
import { getTasks } from "./tasks";

const calculateTotals = () => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.total = 0;
            state.billable = 0;
            state.billed = 0;

            for (const log of state.timelogs) {
                state.total += log.duration;
                if (log.billable) {
                    state.billable += log.duration;
                }
                if (log.billed) {
                    state.billed += log.duration;
                }
            }
            state.remaining = state.estimated - state.total < 0 ? 0 : state.estimated - state.total;
        })
    );
};

const upsertTimelogs = (timelogs: ITimeLog[]) => {
    const newTimelogsTaskIds = timelogs.map((timelog: ITimeLog) => timelog.task);
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.timelogs = upsertById(state.timelogs, timelogs);
            state.isLoading = false;
            state.loadingChunk = state.loadingChunk.filter(id => !newTimelogsTaskIds.includes(id));
        })
    );
};

const load = async (filter: TimelogsFilterParams) => {
    const { isLoading, filters } = TimelogsStore.get();
    if (isLoading) return;

    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.isLoading = true;
            state.timelogs = [];
            state.estimated = 0;
        })
    );

    const timelogs: ITimeLog[] = await TimelogsAPI.load(filter);

    upsertTimelogs(timelogs);

    calculateTotals();
};

const reload = async (update: IUpdate, hasPermission: boolean) => {
    if (hasPermission && update.parent) {
        const tasks = await getTasks([update.parent]);
        if (!tasks.length) {
            return;
        }
        await load({ task: update.parent });
    }
};

const add = async (
    timelogData: Pick<
        ITimeLog,
        "date" | "duration" | "billable" | "billed" | "description" | "person" | "project" | "task"
    >
): Promise<ITimeLog> => {
    const timelog = await TimelogsAPI.add(timelogData);

    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.timelogs.push(timelog);
        })
    );

    calculateTotals();

    return timelog;
};

const update = async (updatedTimelog: ITimeLog) => {
    const { timelogs } = TimelogsStore.get();
    if (!timelogs.length) return;

    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.timelogs = state.timelogs.map((timelog: ITimeLog) => {
                if (timelog.id === updatedTimelog.id) {
                    return updatedTimelog;
                }
                return timelog;
            });
        })
    );

    await TimelogsAPI.update(updatedTimelog.id, updatedTimelog);

    calculateTotals();
};

const remove = async (timelogId: string) => {
    await TimelogsAPI.remove(timelogId);

    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.timelogs = state.timelogs.filter((timelog: ITimeLog) => timelog.id !== timelogId);
        })
    );
    calculateTotals();
};

// const updateTask = (updatedTask: Partial<ITask>) => {
//     const { timelogs } = TimelogsStore.get();
//     if (!timelogs.length) return;

//     TimelogsStore.set(
//         produce((state: ITimelogsStore) => {
//             state.timelogs = state.timelogs.map((timelog: ITimeLog) => {
//                 if (timelog.taskId === updatedTask.id) {
//                     timelog.task = { ...timelog.task, ...updatedTask };
//                 }
//                 return timelog;
//             });
//         })
//     );
// };

const toggleFilters = () => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.filtersVisible = !state.filtersVisible;
        })
    );
};

const loadSaved = () => {
    const savedFilters = Storage.get("saved-time-filters", true, []);
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.savedFilters = savedFilters;
        })
    );
};

const setFilter = (
    filterKey: keyof ITimelogsFilters,
    filterValue: ITimelogsFilters[keyof ITimelogsFilters]
) => {
    const filters = TimelogsStore.get();

    if (filters.filters[filterKey] === filterValue) return;

    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            patchFilterField(state.filters, filterKey, filterValue);
        })
    );
};

const setMultipleFilters = (values: Partial<ITimelogsFilters>) => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.filters = Object.assign(state.filters, values);
        })
    );
};

const debouncedTimelogQuery = createDebouncedCallback(500);
const setQuery = (query: string, cb?: () => void) => {
    debouncedTimelogQuery(() => {
        setFilter("query", query);
        if (cb) cb();
    });
};

const setFilterTitle = (title: string) => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.filters.title = title;
        })
    );
};

const resetFilters = () => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.filters = {
                id: undefined,
                title: undefined,
                query: "",
                assignees: [],
                date: undefined,
                me: undefined,
                billable: false,
                billed: false,
            };
        })
    );
};

const saveFilters = () => {
    const { savedFilters } = TimelogsStore.get();
    Storage.set("saved-time-filters", savedFilters);
};

const deleteFilter = () => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.savedFilters = state.savedFilters.filter(filter => filter.id !== state.filters.id);
        })
    );
    saveFilters();
    resetFilters();
};

const addFilter = (filter: ITimelogsFilters) => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.savedFilters.push(filter);
            state.filters.id = filter.id;
        })
    );

    saveFilters();
};

const updateFilter = (updatedFilter: ITimelogsFilters) => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.savedFilters = state.savedFilters.map(filter => {
                if (filter.id === updatedFilter.id) {
                    return updatedFilter;
                }
                return filter;
            });
        })
    );

    saveFilters();
};

const restoreFilter = (filter: ITimelogsFilters) => {
    TimelogsStore.set(
        produce((state: ITimelogsStore) => {
            state.filters = filter;
        })
    );
};

export const TimelogsActions = {
    load,
    reload,
    add,
    upsertTimelogs,
    update,
    remove,
    toggleFilters,
    loadSaved,
    setFilter,
    setMultipleFilters,
    setQuery,
    setFilterTitle,
    resetFilters,
    deleteFilter,
    addFilter,
    updateFilter,
    restoreFilter,
};
