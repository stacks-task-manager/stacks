// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum AUTOMATION_EVENT {
    CREATED = "created",
    MOVED = "moved",
    DONE = "done",
    TODO = "todo",
    OVERDUE = "overdue",
    STARTED = "started",
    DO = "do",
    ARCHIVED = "archived",
}

export enum AUTOMATION_EVENT_ICON {
    CREATED = "file-04",
    MOVED = "move",
    DONE = "check-circle",
    TODO = "placeholder",
    OVERDUE = "alarm-clock-minus",
    STARTED = "alarm-clock-plus",
    DO = "alarm-clock-check",
    ARCHIVED = "archive",
}

export enum AUTOMATIOD_DO {
    ASSIGN = "assign",
    UNASSIGN = "unassign",
    UNASSIGNALL = "unassignall",
    STARTDATE = "startdate",
    DODATE = "dodate",
    DUEDATE = "duedate",
    ADDTAG = "addtag",
    REMOVETAG = "removetag",
    REMOVEALLTAGS = "removealltags",
    DONE = "done",
    TODO = "todo",
    MOVE = "move",
    ARCHIVE = "archive",
    ADDSTATUS = "addstatus",
    REMOVESTATUS = "removestatus",
    PROGRESS = "progress",
}

type IAutomationActionKeys = AUTOMATIOD_DO;
type IAutomationActionIcon = {
    [key in IAutomationActionKeys]: string;
};
export const AUTOMATION_ACTION_ICON: IAutomationActionIcon = {
    assign: "user-add",
    unassign: "user-remove",
    unassignall: "users-x",
    startdate: "calendar-date",
    dodate: "calendar-date",
    duedate: "calendar-date",
    addtag: "tag",
    removetag: "tag",
    removealltags: "tags",
    done: "check-circle",
    todo: "circle",
    move: "switch-horizontal-01",
    archive: "archive",
    addstatus: "activity",
    removestatus: "activity",
    progress: "percent-02",
};

export interface IAutomationAction {
    id: string;
    do: AUTOMATIOD_DO;
    value: string | number | string[];
    editing?: boolean; // this is set to true when coming from the wizard
}

export interface IAutomation {
    id: string;
    title: string;
    enabled: boolean;
    event: AUTOMATION_EVENT;
    value?: string;
    actions: IAutomationAction[];
}
