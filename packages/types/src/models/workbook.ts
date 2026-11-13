// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ICommonWithPermissions } from "./common.js";
import { PRIORITY } from "./task.js";

export type WorkbookFilterState = "all" | "done" | "todo";

/** Persisted task filters for a reusable workbook view. */
export interface IWorkbookFilters {
    projects: string[];
    tags: string[];
    statuses: string[];
    state: WorkbookFilterState;
    priority?: PRIORITY;
    assignees: string[];
    nobody?: boolean;
    me?: boolean;
    startDate?: string;
    doDate?: string;
    dueDate?: string;
    overdue: boolean;
    inProgress: boolean;
    loggedTime?: boolean;
    skipMe?: boolean;
    onlyAssigned?: boolean;
}

export interface IWorkbook extends ICommonWithPermissions {
    title: string;
    filters: IWorkbookFilters;
}

export const DEFAULT_WORKBOOK_FILTERS: IWorkbookFilters = {
    projects: [],
    tags: [],
    statuses: [],
    state: "todo",
    assignees: [],
    overdue: false,
    inProgress: false,
    loggedTime: false,
};

/** Strip transient or legacy fields while retaining the persisted filter contract. */
export const sanitizeWorkbookFilters = (filters: IWorkbookFilters): IWorkbookFilters => {
    const {
        projects,
        tags,
        statuses,
        state,
        priority,
        assignees,
        nobody,
        me,
        startDate,
        doDate,
        dueDate,
        overdue,
        inProgress,
        loggedTime,
        skipMe,
        onlyAssigned,
    } = filters;
    return {
        projects,
        tags,
        statuses,
        state,
        priority,
        assignees,
        nobody,
        me,
        startDate,
        doDate,
        dueDate,
        overdue,
        inProgress,
        loggedTime,
        skipMe,
        onlyAssigned,
    };
};
