// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ReactNode } from "react";

export enum GROUPING_TYPE {
    UNGROUPED = "ungrouped",
    STACK = "stack",
    STARTDATE = "startdate",
    DUEDATE = "duedate",
    PRIORITY = "priority",
    PEOPLE = "people",
}

export enum GROUPING_TYPE_ICONS {
    UNGROUPED = "align-justify",
    STACK = "dataflow-02",
    STARTDATE = "calendar-date",
    DUEDATE = "calendar-date",
    PRIORITY = "flag",
    PEOPLE = "users",
}
export enum GROUPING_TYPE_LABELS {
    UNGROUPED = "common.group-ungrouped",
    STACK = "common.group-stack",
    STARTDATE = "common.group-start-date",
    DUEDATE = "common.group-due-date",
    PRIORITY = "common.group-priority",
    PEOPLE = "common.group-people",
}

export interface ITableColumnBase<T> {
    title: string;
    width: number;
    minWidth: number;
    maxWidth?: number;
    isSortable?: boolean;
    /** When omitted, sorting uses `row[columnId]` for the active column key. */
    sortAccessor?: (row: T) => string | number | Date | null | undefined;
    unhideable?: boolean;
    fixed?: boolean;
    resizable?: boolean;
    clickable?: boolean;
    help?: string;
    render?: (row: T) => ReactNode | string;
}

export interface ITableColumn extends ITableColumnBase<object> {
    name: string;
}

export interface ITableColumns<T> {
    [id: string]: ITableColumnBase<T>;
}
