// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ITask } from "./task.js";
import { IPerson } from "./people.js";
import { ITimeLog } from "./timelogs.js";

export interface Event {
    allDay?: boolean | undefined;
    title?: React.ReactNode | undefined;
    start?: Date | undefined;
    end?: Date | undefined;
    resource?: any;
}

export enum EVENTTYPE {
    TASK = "task",
    EVENT = "event",
    TIMELOG = "timelog",
    BIRTHDAY = "birthday",
}

export interface ITimeLogExtended extends ITimeLog {
    taskId: string;
}

export interface ICalendarEvent {
    id: string;
    title: string;
    description: string;
    start: Date;
    end: Date;
    allDay: boolean;
    owner?: string;
    assignees: string[];
    color?: string;
    source: "local" | "google" | "microsoft";
    calendar: string;
    location?: string;
    created?: string;
    updated?: string;
    original?: {
        htmlLink?: string;
    };
}

export interface IEventResource {
    data: ICalendarEvent | ITask | IPerson | ITimeLogExtended;
    type: EVENTTYPE;
}

export interface IEvent extends Event {
    resource: IEventResource;
}

export type ICalendarSource = "local" | "google" | "microsoft";
