// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IAutomation } from "./automation.js";
import { ICommonWithPermissions } from "./common.js";
import { IField } from "./fields.js";
import { PROJECTVIEW } from "./record.js";

export enum ARCHIVEDORDER {
    TITLE_ASC = "title-asc",
    TITLE_DESC = "title-desc",
    CREATED_ASC = "created-asc",
    CREATED_DESC = "created-desc",
    UPDATED_ASC = "updated-asc",
    UPDATED_DESC = "updated-desc",
    ARCHIVED_ASC = "archived-asc",
    ARCHIVED_DESC = "archived-desc",
}

export enum PROJECTHEALTH {
    NEEDSATTENTION = "needsAttentions",
    ATRISK = "atRisk",
    GOOD = "good",
}

export interface ISprint {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
}

export interface IProject extends ICommonWithPermissions {
    description: string | null;
    notes: string | null;
    startDate: Date | null;
    endDate: Date | null;
    health: PROJECTHEALTH | null;
    company: string;
    projectOwner: string | null;
    hourlyRate: number;
    currency: string;
    automations: IAutomation[];
    fields: IField[];
    backgroundUrl?: string;
    sprints: ISprint[];
    inbox: boolean;
    approvers: string[];
    estimate: number | null;
    stacksOrder: string[];
}

export interface IProjectCounter {
    [id: string]: number;
}

export interface IProjectTaskCompletionTime {
    name: string;
    value: number;
}

export interface IStackOverview {
    idle: number;
    doing: number;
    done: number;
    overdue: number;
    name: string;
}
export interface IStackTime {
    estimated: number;
    spent: number;
    remaining: number;
    name: string;
}

export interface IProjectTimelogs {
    type: "total" | "billable" | "non-billable";
    data: {
        date: string;
        timespent: number;
    }[];
}

export interface IProjectOverview {
    tasksTotal: number;
    tasksIdle: number;
    tasksInProgress: number;
    tasksCompleted: number;
    tasksToday: number;
    tasksOverdue: number;
    tasksAssigned: number;
    tasksUnassigned: number;
    tasksArchived: number;
    tasksCompletionPercentage: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    stacksCount: number;
    stacksOverview: IStackOverview[];
    stacksTime: IStackTime[];
    assignees: string[];
    workload: IProjectCounter;
    timeEstimatedTotal: number;
    timeLoggedTotal: number;
    timeLoggedNonBillable: number;
    timeLoggedBillable: number;
    timeRemaining: number;
    timeLoad: IProjectCounter;
    budgetEstimated: number;
    budgetSpent: number;
    budgetProfit: number;
    tags: IProjectCounter;
    statuses: IProjectCounter;
    tasksCompletionTime: IProjectTaskCompletionTime[];
    timelogs: IProjectTimelogs[];
}

export interface IProjectView {
    id: PROJECTVIEW;
    icon: string;
}

export const PROJECT_VIEWS: IProjectView[] = [
    { id: PROJECTVIEW.BOARD, icon: "board-view" },
    { id: PROJECTVIEW.LIST, icon: "list-view" },
    { id: PROJECTVIEW.ATTACHMENTS, icon: "attachment-02" },
    { id: PROJECTVIEW.LINKS, icon: "link-03" },
    { id: PROJECTVIEW.OVERVIEW, icon: "overview-view" },
    { id: PROJECTVIEW.TIME, icon: "clock-stopwatch" },
    { id: PROJECTVIEW.WORLD, icon: "map-view" },
    { id: PROJECTVIEW.GANTT, icon: "dataflow-03" },
    { id: PROJECTVIEW.NOTES, icon: "book-closed" },
];

export const PROJECT_DEFAULT_VIEWS = [PROJECTVIEW.BOARD, PROJECTVIEW.LIST, PROJECTVIEW.OVERVIEW];
