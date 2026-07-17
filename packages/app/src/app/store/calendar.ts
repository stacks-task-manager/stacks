// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar view state (date, view mode).
 */
import { EVENTTYPE, IEvent, ICalendarCount, ICalendarRemote, ILocalCalendar } from "@stacks/types";
import { PreferencesStore } from "./preferences";
import { entity } from "app/hooks/store";
import { getStorage } from "app/utils/storage";
import { produce } from "immer";

export type { ICalendarRemote };

export interface ICalendarFilters {
    showCalendars: string[];
    showTasks: boolean;
    showBirthdays: boolean;
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
    selected?: [string, EVENTTYPE];
    tokens: ICalendarAuth;
    filters: ICalendarFilters;
    loadingCalendars: boolean;
    calendars: ICalendarRemote[];
    localCalendars: ILocalCalendar[];
    loadingLocalCalendars: boolean;
}

const DEFAULT_FILTERS: ICalendarFilters = {
    showCalendars: ["local"],
    showTasks: true,
    showBirthdays: true,
    showProjects: [],
};

export const CALENDAR_FILTERS_STORAGE_KEY = "calendar-filters";

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
    localCalendars: [],
    loadingLocalCalendars: false,
}, [
    {
        init: (origInit, entityInstance) => () => {
            origInit();

            const storedFilters = getStorage<ICalendarFilters | null>(CALENDAR_FILTERS_STORAGE_KEY, true, null);
            if (storedFilters == null) return;

            entityInstance.set(
                produce((state: ICalendarStore) => {
                    state.filters = {
                        ...DEFAULT_FILTERS,
                        ...storedFilters,
                        showCalendars: Array.isArray(storedFilters.showCalendars)
                            ? storedFilters.showCalendars
                            : DEFAULT_FILTERS.showCalendars,
                        showProjects: Array.isArray(storedFilters.showProjects)
                            ? storedFilters.showProjects
                            : DEFAULT_FILTERS.showProjects,
                    };
                })
            );
        },
    },
]);
