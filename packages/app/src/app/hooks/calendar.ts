// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar hooks and selectors.
 */
import { useEffect, useRef } from "react";
import { CalendarActions } from "app/store/actions";
import { TasksActions } from "app/store/actions";
import { CalendarStore } from "app/store/calendar";
import { shallowEqual } from "./store";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { useTasksByPeriod } from "./tasks";
import { EVENTTYPE, type ICalendarEvent } from "@stacks/types";
import { usePeopleWithBirthdayInRange } from "./people";

export const useCalendars = () => {
    const { tokens, calendars, loading } = CalendarStore.use(
        state => ({
            tokens: state.tokens,
            filters: state.filters,
            calendars: state.calendars,
            loading: state.loadingCalendars,
        }),
        shallowEqual
    );

    const isGoogleAuthenticated = tokens.google != null;

    const loadCalendars = () => {
        CalendarActions.loadCalendars();
    };

    return { isGoogleAuthenticated, calendars, loading, loadCalendars };
};

export const useCalendarsFilters = () => {
    return CalendarStore.use(state => state.filters, shallowEqual);
};

export const useSelectedEvent = () => {
    return CalendarStore.use(
        state => state.selected,
        shallowEqual
    );
};

export const getDatesSpan = () => {
    const { date, view } = CalendarStore.get();

    // get events
    let from = new Date();
    let to = new Date();
    if (view === "agenda") {
        from = startOfDay(date);
        to = endOfDay(date);
    } else if (view === "month") {
        from = startOfMonth(date);
        to = endOfMonth(date);
    } else if (view === "week") {
        from = startOfWeek(date);
        to = endOfWeek(date);
    } else {
        from = startOfDay(date);
        to = endOfDay(date);
    }
    return { from, to };
}

export const useDatesSpan = () => {
    const { date, view } = CalendarStore.use(state => ({
        date: state.date,
        view: state.view,
    }), shallowEqual);

    // get events
    let from = new Date();
    let to = new Date();
    if (view === "agenda") {
        from = startOfDay(date);
        to = endOfDay(date);
    } else if (view === "month") {
        from = startOfMonth(date);
        to = endOfMonth(date);
    } else if (view === "week") {
        from = startOfWeek(date);
        to = endOfWeek(date);
    } else {
        from = startOfDay(date);
        to = endOfDay(date);
    }
    return { from, to };
}

export const useEvents = () => {
    const { from, to } = useDatesSpan();
    const { events, filters } = CalendarStore.use(state => ({
        events: state.events,
        filters: state.filters
    }), shallowEqual);

    // Track last loaded dates to avoid redundant API calls
    const lastFromRef = useRef<string | null>(null);
    const lastToRef = useRef<string | null>(null);

    useEffect(() => {
        const fromStr = from.toISOString();
        const toStr = to.toISOString();
        if (fromStr !== lastFromRef.current || toStr !== lastToRef.current) {
            lastFromRef.current = fromStr;
            lastToRef.current = toStr;
            void TasksActions.loadPeriod(from, to);
        }
    }, [from, to]);

    const { tasks } = useTasksByPeriod(from, to, true);

    const allEvents = events.filter(ev => {
        if (ev.resource.type !== EVENTTYPE.EVENT) return true;
        const calEvent = ev.resource.data as ICalendarEvent;
        if (calEvent.source === "local") {
            return filters.showCalendars.includes("local");
        }
        if (calEvent.source === "google") {
            return filters.showCalendars.includes(`google-${calEvent.calendar}`);
        }
        return true;
    });

    if (filters.showTasks) {
        for (const task of tasks) {
            let start = new Date();
            let end = new Date();

            if (task.startdate && task.duedate) {
                start = task.startdate;
                end = task.duedate;
            } else if (task.startdate && !task.duedate) {
                start = task.startdate;
                end = new Date(task.startdate.getTime() + 3600_000);
            } else if (task.duedate && !task.startdate) {
                end = task.duedate;
                start = new Date(task.duedate.getTime() - 3600_000);
            }

            allEvents.push({
                title: task.title,
                start,
                end,
                allDay: false,
                resource: {
                    data: task,
                    type: EVENTTYPE.TASK
                },
            });
        }
    }

    const people = usePeopleWithBirthdayInRange(from, to);

    if (filters.showBirthdays) {
        for (const person of people) {
            allEvents.push({
                title: `${person.firstName} ${person.lastName}'s birthday`,
                start: (() => {
                    if (!person.birthday) return new Date();
                    const currentYear = new Date().getFullYear();
                    return new Date(currentYear, person.birthday.getMonth(), person.birthday.getDate());
                })(),
                end: (() => {
                    if (!person.birthday) return new Date();
                    const currentYear = new Date().getFullYear();
                    return new Date(currentYear, person.birthday.getMonth(), person.birthday.getDate());
                })(),
                allDay: true,
                resource: {
                    data: person,
                    type: EVENTTYPE.BIRTHDAY,
                },
            });
        }
    }

    return allEvents;
}
