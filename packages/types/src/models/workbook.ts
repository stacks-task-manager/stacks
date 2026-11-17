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

/** A project reference used when building workbook overview data. */
export interface IProjectReference {
    id: string;
    title: string;
}

/** A single day entry in the workbook deadline horizon. */
export interface IWorkbookDeadlineDay {
    label: string;
    count: number;
}

/** Overdue count plus per-day breakdown for the next 7 days. */
export interface IWorkbookDeadline {
    overdue: number;
    days: IWorkbookDeadlineDay[];
}

/** Task counts per project inside a workbook. */
export interface IWorkbookProjectWorkload {
    id: string;
    title: string;
    total: number;
    inProgress: number;
    done: number;
}

/** Open tasks missing planning data, grouped by gap type. */
export interface IWorkbookPlanningGaps {
    noDueDate: number;
    noStartDate: number;
    noAssignees: number;
}

/** Completion totals and progress percentage for a workbook. */
export interface IWorkbookMomentum {
    total: number;
    completed: number;
    progress: number;
    percent: number;
}

/** An open task spending more time than its estimate. */
export interface IWorkbookOverrunTask {
    id: string;
    title: string;
    project: string;
    estimateMinutes: number;
    loggedMinutes: number;
    overrunPct: number;
}

/** Open tasks over their time estimate, ranked by overrun percentage. */
export interface IWorkbookOverBudget {
    count: number;
    tasks: IWorkbookOverrunTask[];
}

/** How long completed tasks took and how old open tasks are. */
export interface IWorkbookLeadTime {
    avgCompletionDays: number | null;
    medianOpenAgeDays: number | null;
}

/** A recently completed task shown in the workbook overview. */
export interface IWorkbookRecentCompletion {
    id: string;
    title: string;
    project: string;
    doneAt?: Date | null;
}

/** Aggregated data for the workbook overview view. */
export interface IWorkbookOverview {
    tasksTotal: number;
    tasksIdle: number;
    tasksInProgress: number;
    tasksCompleted: number;
    tasksArchived: number;
    tasksStartingToday: number;
    tasksOverdue: number;
    projects: IWorkbookProjectWorkload[];
    deadline: IWorkbookDeadline;
    critical: number;
    high: number;
    medium: number;
    low: number;
    assigneeIds: string[];
    workload: Map<string, number>;
    timeEstimatedTotal: number;
    timeLoggedTotal: number;
    timeRemaining: number;
    planningGaps: IWorkbookPlanningGaps;
    overBudget: IWorkbookOverBudget;
    leadTime: IWorkbookLeadTime;
    momentum: IWorkbookMomentum;
    recentCompleted: IWorkbookRecentCompletion[];
}
