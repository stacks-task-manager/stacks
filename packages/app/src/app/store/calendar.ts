// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar view state (date, view mode).
 */
import { IEvent } from "@stacks/types";
import { PreferencesStore } from "./preferences";
import { entity } from "app/hooks/store";

export interface ICalendarCount {
    events: number;
    tasks: number;
    birthdays: number;
}

export interface ICalendarRemote {
    title: string;
    id: string;
    color: string;
    primary: boolean;
    source: "google" | "microsoft";
    readOnly: boolean;
}

export interface ICalendarFilters {
    showCalendars: string[];
    showTasks: boolean;
    showCompletedTasks: boolean;
    showLoggedTime: boolean;
    showBirthdays: boolean;
    showTimebox: boolean;
    showProjects: string[];
}

export interface ICalendarAuth {
    google: object | null;
}

export interface ICalendarStore {
    view: "month" | "week" | "day" | "agenda";
    date: Date;
    isLoading: boolean;
    events: IEvent[];
    showFilters: boolean;
    newEvent?: IEvent;
    todaysCount: ICalendarCount;
    selected?: string;
    tokens: ICalendarAuth;
    filters: ICalendarFilters;
    loadingCalendars: boolean;
    calendars: ICalendarRemote[];
}

const DEFAULT_FILTERS: ICalendarFilters = {
    showCalendars: ["local"],
    showTasks: true,
    showCompletedTasks: false,
    showLoggedTime: false,
    showBirthdays: true,
    showTimebox: true,
    showProjects: [],
};

export const CalendarStore = entity<ICalendarStore>({
    view: (PreferencesStore.get().calendarDefaultView as ICalendarStore["view"]) || "month",
    date: new Date(),
    isLoading: false,
    events: [],
    showFilters: false,
    todaysCount: {
        events: 0,
        tasks: 0,
        birthdays: 0,
    },
    tokens: {
        google: null,
    },
    filters: { ...DEFAULT_FILTERS },
    loadingCalendars: false,
    calendars: [],
});
