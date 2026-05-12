// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelog list and selection for tasks.
 */
import { entity } from "app/hooks/store";

import { ITimeLog } from "@stacks/types";

export interface ITimelogsFilters {
    id?: string;
    title?: string;
    query: string;
    date?: string;
    me?: string;
    billable: boolean;
    billed: boolean;
    assignees: string[];
}

export interface ITimelogsStore {
    timelogs: ITimeLog[];
    isLoading: boolean;
    loadingChunk: string[]; // ids of tasks for whom it is loading timelogs
    total: number;
    estimated: number;
    billable: number;
    billed: number;
    remaining: number;
    filtersVisible: boolean;
    filters: ITimelogsFilters;
    savedFilters: ITimelogsFilters[];
}

export const TimelogsStore = entity<ITimelogsStore>({
    timelogs: [],
    isLoading: false,
    loadingChunk: [],
    total: 0,
    estimated: 0,
    billable: 0,
    billed: 0,
    remaining: 0,
    filtersVisible: false,
    filters: {
        query: "",
        assignees: [],
        billable: false,
        billed: false,
    },
    savedFilters: [],
});
