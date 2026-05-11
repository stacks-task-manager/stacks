// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Activity feed enums and row shape (mirrors DB JSON columns).
 */
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
    created: string;
    updated?: string;
}
