// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ICommon } from "./common";

export enum NOTIFICATION_RECORD_TYPE {
    TASK = "task",
    NOTEPAD = "notepad",
    TIMELOG = "timelog",
    PROJECT = "project",
    COMMENT = "comment",
    PERSON = "person",
}

export interface INotification extends ICommon {
    recipient: string;
    subject: string;
    message: string;
    recordId?: string;
    recordType?: NOTIFICATION_RECORD_TYPE;
    data: any[];
    read: boolean;
}
