// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ICommonWithPermissions } from "./common.js";
import { ISimpleDocument } from "./record.js";

export interface ITask extends ICommonWithPermissions {
    title: string;
    description: string;

    project: string; // project where this task is located
    projectInfo: ISimpleDocument | null;
    stack: string; // the stack id where it is located

    tags: string[];
    status: string | null;
    startdate: Date | null;
    duedate: Date | null;
    dodate: Date | null;
    cover: string | null; // cover url if available
    done: boolean; // wether the task is done or not
    estimate: number; // estimated time in minutes
    progress: number; // current task progress
    assignees: string[];
    priority: PRIORITY | null;
    parent: string | null; // the parent task id in case this is a subtask of another one
    subtasksOrder: string[]; // the position of the subtasks
    tint: string | null;
    dependencies: string[]; // a list of task ids that depend on this task

    hourlyRate: number; // overwrites the project hourly rate

    repeats?: IRepeats; // defines how often the task repeats
    locations: ILocation[]; // a list of locations
    links: ILink[]; // a list of links
    fields: ITaskFieldValues; // custom fields values
    timeSpent: number; // total number of time spent from logged time
    comments: number; // number of comments
    attachments: number; // number of attachments
    reminders: string[]; // a list of dates when the user should be reminders
    completed: Date | null; // date when the task was completed
    archived: Date | null; // date when the task was archived
}

export enum PRIORITY {
    NONE = "none",
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical",
}

export enum PRIORITYICON {
    LOW = "arrow-down",
    MEDIUM = "minus",
    HIGH = "arrow-up",
    CRITICAL = "arrows-up",
}

export interface ILocation {
    id: string;
    coordinates: [number, number];
    title: string;
}

export interface ILink {
    id: string;
    url: string;
    preview?: string;
    title: string;
    created: Date;
    updated: Date;
}

export interface IExtendedLink extends ILink {
    task: ITask;
}

export const TaskTemplate: Partial<ITask> = {
    title: "",
    description: "",
    id: "",
    project: "",
    created: new Date(),
    updated: new Date(),
    archived: new Date(),
    timeSpent: 0,
    comments: 0,
    attachments: 0,
};

export interface ITaskOrder {
    [key: string]: string[];
}

export enum REPEATTYPE {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
    PERIODICALLY = "periodically",
}
export interface IRepeats {
    type: REPEATTYPE;
    value: string;
    reopen: boolean;
    dates: string[];
}

export enum TASKDETAILMATRIX {
    ASSIGNEES = "assignees",
    PRIORITY = "priority",
    STATUS = "status",
    REPEATS = "repeats",
    PROGRESS = "progress",
    TAGS = "tags",
    PROJECTS = "projects",
    ESTIMATE = "estimate",
    STACK = "stack",
    TIMESPENT = "timespent",
    DUEDATE = "duedate",
    STARTDATE = "startdate",
    DODATE = "dodate",
    DATES = "dates",
    SPENTPROGRESS = "spentprogress",
    COVER = "cover",
    TINT = "tint",
    ID = "id",
    HOURLY_RATE = "hourlyRate",
}

export interface ITaskFieldValues {
    [id: string]: string;
}

export interface ITaskTimers {
    [taskId: string]: number;
}
