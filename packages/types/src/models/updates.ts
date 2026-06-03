// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPermissions } from "./permissions";

export enum POLLINGACTIONS {
    CREATE = "create",
    DELETED = "delete",
    UPDATE = "update",
    ARCHIVED = "archived",
    UNARCHIVED = "unarchived",
}

export enum POLLINGTYPE {
    PROJECT = "project",
    STACK = "stack",
    TASK = "task",
    DOCUMENTS = "documents",
    DOCUMENT = "document",
    ACTIVITY = "activity",
    ACTIVITIES = "activities",
    NOTEPAD = "notepad",
    PERSON = "person",
    PEOPLE = "people",
    COMPANY = "company",
    COMPANIES = "companies",
    BOOKMARKS = "bookmarks",
    TIMELOG = "timelog",
    NOTIFICATION = "notification",
    PERMISSION = "permission",
}

export interface IUpdate {
    type: POLLINGTYPE;
    record: string;
    parent?: string;
    user: string;
    action: POLLINGACTIONS;
    timestamp: number;
    instanceId?: string;
    permissions?: IPermissions;
    automation?: boolean;
    data?: any;
}
