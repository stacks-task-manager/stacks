// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { IPerson } from "./people.js";

export enum ACTIVITYTYPE {
    MESSAGE = "message",
    LOG = "log",
}

export enum ACTIVITYRESOURCETYPE {
    TASK = "task",
}

export interface IActivityChange {
    field: string;
    before?: any;
    after: any;
}

export interface IActivity {
    id: string;
    resourceId: string;
    resourceType: ACTIVITYRESOURCETYPE;
    type: ACTIVITYTYPE;
    person?: string;
    parent?: string;
    content: string;
    change?: IActivityChange;
    created: Date;
    updated: Date;
}

export interface IComment extends IActivity {
    assignee?: IPerson;
}
