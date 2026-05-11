// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPermissions } from "./permissions.js";

export enum TASKSORTING {
    TITLEASC = "title-asc",
    TITLEDESC = "title-desc",
    PRIROITYASC = "priority-asc",
    PRIORITYDESC = "priority-desc",
    DUEDATEASC = "duedate-asc",
    DUEDATEDESC = "duedate-desc",
    STARTDATEASC = "startdate-asc",
    STARTDATEDESC = "startdate-desc",
}

export interface IStack {
    title: string;
    id: string;
    project: string;
    collapsed?: boolean;
    tint?: string;
    maxTasks?: number;
    sorting?: TASKSORTING;
    tasksOrder: string[];
    created: Date;
    updated: Date;
}

export type INewStack = Omit<IStack, "id" | "permissions" | "tasksOrder" | "created" | "updated">;

export const StackTemplate: IStack = {
    title: "",
    id: "",
    project: "",
    collapsed: false,
    tasksOrder: [],
    created: new Date(),
    updated: new Date(),
};
