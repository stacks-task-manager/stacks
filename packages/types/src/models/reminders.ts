// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum REMINDER_RECORD_TYPE {
    NOTE = "note",
    TASK = "task",
}

export interface IReminder {
    id: string;
    title: string;
    subtitle?: string;
    date: Date;
    recordId: string;
    recordType: REMINDER_RECORD_TYPE;
    url?: string;
}
