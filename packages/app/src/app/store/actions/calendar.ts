// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar data loading and mutations.
 */
import api, { CalendarIntegrationsAPI, type CalendarProvider, CalendarsAPI, EventsAPI } from "app/api";
import {
    addDays,
    addHours,
    addMonths,
    addWeeks,
    endOfDay,
    format,
    isSameDay,
    setHours,
    setMinutes,
    startOfDay,
    subDays,
    subMonths,
    subWeeks,
} from "date-fns";
import { produce } from "immer";
import { xor } from "lodash";

import { EVENTTYPE, ICalendarEvent, ICalendarSource, IEvent, ICalendar, ITask } from "@stacks/types";
import { getDatesSpan } from "app/hooks";
import Dialog from "app/utils/dialog";
import Storage from "app/utils/storage";
import Toast from "app/utils/toast";
import { patchFilterField } from "../actionHelpers";
import { CALENDAR_FILTERS_STORAGE_KEY, CalendarStore, ICalendarFilters, ICalendarStore } from "../calendar";
import { TasksActions } from "./tasks";

const toDate = (date: Date | string) => (date instanceof Date ? new Date(date) : new Date(date));

const normalizeCalendarEventDate = (date: Date | string, allDay: boolean, boundary: "start" | "end") => {
    const normalized = toDate(date);
    if (!allDay) return normalized;

    return boundary === "start" ? startOfDay(normalized) : endOfDay(normalized);
};

const makeTaskCalendarEvent = (task: ITask, start?: Date, end?: Date, allDay?: boolean): IEvent => ({
    title: task.title,
    start,
    end,
    allDay,
    resource: {
        data: task,
        type: EVENTTYPE.TASK,
    },
});

const upsertCalendarEvent = (events: IEvent[], incoming: IEvent) => {
    const incomingId = incoming.resource.data.id;
    const index = events.findIndex(event => event.resource.data.id === incomingId);

    if (index === -1) {
        return [...events, incoming];
    }

    return events.map(event => (event.resource.data.id === incomingId ? incoming : event));
};

const savePrefs = async () => {
    const { filters } = CalendarStore.get();
    await api("events/savePrefs", { filters });
};

const persistFilters = () => {
    Storage.set(CALENDAR_FILTERS_STORAGE_KEY, CalendarStore.get().filters);
};

let loadingCalendar = false;
let pendingCalendarLoad = false;
let calendarsLoaded = false;
const load = async (reset = true) => {
    if (loadingCalendar) {
        pendingCalendarLoad = true;
        return;
    }
    loadingCalendar = true;
    pendingCalendarLoad = false;

    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.isLoading = true;
        })
    );

    try {
        const localEvents: IEvent[] = [];
        const { from, to } = getDatesSpan();
        const showCalendars = CalendarStore.get().filters.showCalendars;
        const calendars = Array.from(
            new Set(
                showCalendars
                    .map(calendarId => {
                        if (calendarId === "local") return "local";
                        if (calendarId.startsWith("google-"))
                            return `google:${calendarId.slice("google-".length)}`;
                        return calendarId;
                    })
                    .filter((v): v is string => typeof v === "string" && v.length > 0)
            )
        );
        const calEvents = await EventsAPI.loadEvents(from, to, calendars.length ? calendars : undefined);

        for (const event of calEvents) {
            const start = normalizeCalendarEventDate(event.start, event.allDay, "start");
            const end = normalizeCalendarEventDate(event.end, event.allDay, "end");

            localEvents.push({
                title: event.title,
                start: start,
                end: end,
                allDay: event.allDay,
                resource: {
                    data: event,
                    type: EVENTTYPE.EVENT,
                },
            });
        }

        if (!calendarsLoaded) {
            await loadCalendars();
        }

        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.events = localEvents;
                state.isLoading = false;
            })
        );
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading calendar events:", error);
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.isLoading = false;
            })
        );
        Toast.warn("Failed to load calendar events.");
    } finally {
        loadingCalendar = false;
        if (pendingCalendarLoad) {
            pendingCalendarLoad = false;
            void load(reset);
        }
    }
};

const refreshConnectedCalendars = async () => {
    await loadCalendars();
};

const reload = async () => {
    await refreshConnectedCalendars();
    await load(false);
};

const setView = (view: "month" | "week" | "day" | "agenda") => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.view = view;
        })
    );
};

const setDate = (date: Date) => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.date = date;
        })
    );
};

const setToday = () => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.date = new Date();
        })
    );
};

const goPrev = () => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            const now = state.date || new Date();

            if (state.view === "day") {
                state.date = subDays(now, 1);
            } else if (state.view === "week") {
                state.date = subWeeks(now, 1);
            } else if (state.view === "month" || state.view === "agenda") {
                state.date = subMonths(now, 1);
            }
        })
    );
};

const goNext = () => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            const now = state.date || new Date();

            if (state.view === "day") {
                state.date = addDays(now, 1);
            } else if (state.view === "week") {
                state.date = addWeeks(now, 1);
            } else if (state.view === "month" || state.view === "agenda") {
                state.date = addMonths(now, 1);
            }
        })
    );
};

const changeEvent = async (
    resize: boolean,
    changedEvent: {
        event: IEvent;
        start: Date | string;
        end: Date | string;
        isAllDay: boolean;
    }
) => {
    const actualEvent: IEvent = changedEvent.event;

    const viewType = CalendarStore.get().view;
    let allDay = changedEvent.isAllDay ?? actualEvent.allDay;

    if (viewType === "week" || viewType === "day") {
        allDay = changedEvent.isAllDay ?? false;
    }

    // update the task
    if (actualEvent.resource.type === EVENTTYPE.TASK) {
        const task: ITask = actualEvent.resource.data as ITask;
        let startDate: Date | undefined = undefined;
        let dueDate: Date | undefined = undefined;

        // if task had both dates
        if (task.startdate && task.duedate) {
            startDate = resize ? toDate(changedEvent.start) : toDate(task.startdate);
            dueDate = resize ? toDate(changedEvent.end) : toDate(task.duedate);

            if (allDay && startDate && dueDate && isSameDay(startDate, dueDate)) {
                startDate = undefined;
            }
        }

        // if task had only start date
        else if (task.startdate && !task.duedate) {
            startDate = toDate(changedEvent.start);
        }
        // if task had only due date
        else if (!task.startdate && task.duedate) {
            dueDate = toDate(changedEvent.end);
            startDate = toDate(changedEvent.start);

            if (dueDate && startDate && isSameDay(dueDate, startDate) && allDay) {
                startDate = undefined;
            }
        }

        if (startDate != null) {
            startDate = allDay ? setMinutes(setHours(startDate, 12), 0) : startDate;
        } else {
            startDate = dueDate;
            if (allDay && dueDate) {
                startDate = setMinutes(setHours(dueDate, 12), 0);
            }
        }

        if (dueDate != null) {
            dueDate = allDay ? setMinutes(setHours(dueDate, 12), 30) : dueDate;
        } else {
            dueDate = startDate;
            if (allDay && startDate) {
                dueDate = setMinutes(setHours(startDate, 12), 30);
            }
        }

        const previousEvents = CalendarStore.get().events;

        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.events = state.events.map((event: IEvent) => {
                    if (event.resource.data.id === actualEvent.resource.data.id) {
                        const ev = {
                            ...event,
                            start: startDate,
                            end: dueDate,
                            allDay,
                        };

                        return ev;
                    }
                    return event;
                });
            })
        );

        try {
            await TasksActions.update(actualEvent.resource.data.id, {
                startdate: startDate,
                duedate: dueDate,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error updating task calendar dates:", error);
            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.events = previousEvents;
                })
            );
            Toast.warn("Failed to update task dates.");
        }
    }
    // update an event
    else if (actualEvent.resource.type === EVENTTYPE.EVENT) {
        const allDay = changedEvent.isAllDay ?? changedEvent.event.allDay;
        const calEvent = changedEvent.event.resource.data as ICalendarEvent;

        await updateEvent(calEvent.id, {
            ...calEvent,
            start: normalizeCalendarEventDate(changedEvent.start, allDay, "start"),
            end: normalizeCalendarEventDate(changedEvent.end, allDay, "end"),
            allDay,
        });
    }
};

const onTaskDrop = async (task: ITask, start: Date, allDay: boolean, end?: Date) => {
    const { view } = CalendarStore.get();

    const updatedTask: Partial<ITask> = {};

    let event: IEvent;

    if (view === "month" || (end && format(start, "HH:mm") === format(end, "HH:mm"))) {
        const dueDate = toDate(start);
        updatedTask.duedate = dueDate;
        event = makeTaskCalendarEvent(
            { ...task, ...updatedTask },
            dueDate,
            end ? endOfDay(toDate(end)) : addHours(dueDate, 1),
            true
        );
    } else {
        const startDate = toDate(start);
        const endDate = addHours(startDate, 1);
        updatedTask.startdate = startDate;
        updatedTask.duedate = endDate;

        event = makeTaskCalendarEvent(
            { ...task, ...updatedTask },
            startDate,
            end ? toDate(end) : endDate,
            false
        );
    }

    const previousEvents = CalendarStore.get().events;

    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.events = upsertCalendarEvent(state.events, event);
        })
    );

    try {
        await TasksActions.update(task.id, updatedTask);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error scheduling task on calendar:", error);
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.events = previousEvents;
            })
        );
        Toast.warn("Failed to schedule task.");
    }
};

const toggleFilters = () => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.showFilters = !state.showFilters;
            state.selected = undefined;
        })
    );
};

const updateDebounces = new Map<string, ReturnType<typeof setTimeout>>();
const updateEvent = async (eventId: string, updatedEvent: Partial<ICalendarEvent>, skipSave = false) => {
    const previousEvents = CalendarStore.get().events;

    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.events = state.events.map(ev => {
                if (ev.resource.data.id === eventId) {
                    const event = {
                        ...ev,
                        resource: {
                            ...ev.resource,
                            data: {
                                ...ev.resource.data,
                                ...updatedEvent,
                            } as ICalendarEvent,
                        },
                    };

                    if (updatedEvent.title != null) {
                        event.title = updatedEvent.title;
                    }

                    if (updatedEvent.allDay != null) {
                        event.allDay = updatedEvent.allDay;
                    }

                    if (updatedEvent.start != null) {
                        event.start = normalizeCalendarEventDate(
                            updatedEvent.start,
                            event.allDay === true,
                            "start"
                        );
                    }

                    if (updatedEvent.end != null) {
                        event.end = normalizeCalendarEventDate(
                            updatedEvent.end,
                            event.allDay === true,
                            "end"
                        );
                    }

                    if (updatedEvent.allDay != null) {
                        event.allDay = updatedEvent.allDay;
                    }

                    return event;
                }
                return ev;
            });
        })
    );

    if (skipSave) return;

    const existingDebounce = updateDebounces.get(eventId);
    if (existingDebounce) {
        clearTimeout(existingDebounce);
        updateDebounces.delete(eventId);
    }

    const debounce = setTimeout(async () => {
        const { start, end, ...rest } = updatedEvent;
        const startChanged = start != null;
        const endChanged = end != null;

        const payload: Partial<ICalendarEvent> = { ...rest };

        if (startChanged || endChanged) {
            const current = CalendarStore.get().events.find(e => e.resource.data.id === eventId);
            const currentStart = current?.start;
            const currentEnd = current?.end;

            const startToSend = startChanged
                ? toDate(start)
                : currentStart
                ? toDate(currentStart)
                : undefined;
            let endToSend = endChanged ? toDate(end) : currentEnd ? toDate(currentEnd) : undefined;

            if (startToSend && endToSend && endToSend <= startToSend) {
                endToSend = addHours(startToSend, 1);
            }

            if (startToSend) payload.start = startToSend;
            if (endToSend) payload.end = endToSend;
        }

        try {
            await EventsAPI.update(eventId, payload);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error updating calendar event:", error);
            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.events = previousEvents;
                })
            );
            Toast.warn("Failed to update event.");
        } finally {
            if (updateDebounces.get(eventId) === debounce) {
                updateDebounces.delete(eventId);
            }
        }
    }, 500);

    updateDebounces.set(eventId, debounce);
};

const addEvent = async (event: Omit<ICalendarEvent, "id">) => {
    try {
        const savedEvent = await EventsAPI.add(event);

        CalendarStore.set(
            produce((state: ICalendarStore) => {
                const start = normalizeCalendarEventDate(savedEvent.start, event.allDay, "start");
                const end = normalizeCalendarEventDate(savedEvent.end, event.allDay, "end");

                const calEvent = {
                    title: savedEvent.title,
                    start: start,
                    end: end,
                    allDay: event.allDay,
                    resource: {
                        data: savedEvent,
                        type: EVENTTYPE.EVENT,
                    },
                };

                state.events = upsertCalendarEvent(state.events, calEvent);
            })
        );

        return savedEvent;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error creating calendar event:", error);
        Toast.warn("Failed to create event.");
        return false;
    }
};

const addTempEvent = async (startDate: Date, endDate: Date) => {
    const { view } = CalendarStore.get();
    const allDay = view === "month" ? true : false;

    const start = startDate;
    let end = endDate;

    if (view === "month") {
        end = subDays(end, 1);
    }

    // Get the default calendar ID
    const defaultCalendar = CalendarStore.get().calendars.find(c => c.source === "local" && c.primary);
    const calendarId = defaultCalendar?.id ?? "local";

    const newEvent: ICalendarEvent | false = await addEvent({
        title: "New event",
        description: "",
        start: startOfDay(start),
        end: endOfDay(end),
        allDay,
        assignees: [],
        source: "local",
        calendar: calendarId,
    });

    if (newEvent) {
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.selected = [`${newEvent.id}-new`, EVENTTYPE.EVENT];
                state.showFilters = false;
            })
        );
    }
};

const deleteEvent = async (eventId: string) => {
    try {
        const deleted = await EventsAPI.remove(eventId);

        if (deleted) {
            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.events = state.events.filter(ev => ev.resource.data.id !== eventId);
                    if (state.selected && state.selected[0] === eventId) {
                        state.selected = undefined;
                    }
                })
            );
        } else {
            Toast.warn("There was a problem while removing the selected event");
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error deleting calendar event:", error);
        Toast.warn("There was a problem while removing the selected event");
    }
};

const deleteEventAlert = async (eventId: string) => {
    const response = await Dialog.confirm(
        "Delete event",
        "Are you sure you want to remove this event? This action cannot be undone!"
    );

    if (response) {
        await deleteEvent(eventId);
    }

    return response;
};

const deleteSelectedEvent = async () => {
    const selectedEventId = CalendarStore.get().selected;
    if (selectedEventId == null) return;

    const selectedEvent = CalendarStore.get().events.find(
        event => event.resource.data.id === selectedEventId[0]
    );

    if (selectedEvent && selectedEvent.resource.type === EVENTTYPE.EVENT) {
        await deleteEventAlert(selectedEventId[0]);
    }
};

const setNewEvent = (event?: IEvent) => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.newEvent = event;
        })
    );
};

const selectEvent = (eventId: string, type: EVENTTYPE) => {
    if (CalendarStore.get().selected?.[1] === type && CalendarStore.get().selected?.[0] === eventId) return;

    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.selected = [eventId, type];
            state.showFilters = false;
        })
    );
};

const unselectEvent = () => {
    if (CalendarStore.get().selected == null) return;
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.selected = undefined;
            state.showFilters = false;
        })
    );
};

const clearSelectedEvent = () => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.selected = undefined;
        })
    );
};

const setFilter = async (key: keyof ICalendarFilters, value: ICalendarFilters[keyof ICalendarFilters]) => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            patchFilterField(state.filters, key, value);
        })
    );

    persistFilters();
    try {
        await savePrefs();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error saving calendar filters:", error);
        Toast.warn("Failed to save calendar filters.");
    }
};

const toggleCalendar = async (calendarId: string) => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.filters.showCalendars = xor(state.filters.showCalendars, [calendarId]);
        })
    );

    persistFilters();
    try {
        await savePrefs();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error saving calendar filters:", error);
        Toast.warn("Failed to save calendar filters.");
    }
};

// const restoreCachedCalendars = () => {
//     const calendars = Storage.get("cached-calendars", true, []);
//     CalendarStore.set(
//         produce((state: ICalendarStore) => {
//             state.calendars = calendars;
//         })
//     );
// };

let loadCalendarsPromise: Promise<void> | null = null;
const loadCalendars = async () => {
    if (loadCalendarsPromise) return loadCalendarsPromise;

    const promise = (async () => {
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.loadingCalendars = true;
            })
        );

        try {
            // Load local calendars
            const localCalendars: ICalendar[] = await CalendarsAPI.list();

            // Load Google calendars if authenticated
            let googleCalendars: Array<{
                id: string;
                title: string;
                color: string;
                source: "google" | "microsoft";
                primary: boolean;
                readOnly: boolean;
            }> = [];
            if (CalendarStore.get().tokens.google != null) {
                googleCalendars = await CalendarIntegrationsAPI.listCalendars("google");
            }

            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.calendars = [...localCalendars, ...googleCalendars];
                    state.loadingCalendars = false;
                })
            );
            calendarsLoaded = true;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error loading calendars:", error);
            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.loadingCalendars = false;
                })
            );
            Toast.warn("Failed to load calendars.");
        }
    })();

    loadCalendarsPromise = promise;
    void promise.finally(() => {
        if (loadCalendarsPromise === promise) {
            loadCalendarsPromise = null;
        }
    });
    return promise;
};

const createLocalCalendar = async (title: string, color?: string, primary = false) => {
    try {
        const calendar = await CalendarsAPI.create({ title, color, primary });
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                if (calendar.primary) {
                    state.calendars = state.calendars.map(existingCalendar =>
                        existingCalendar.source === "local"
                            ? { ...existingCalendar, primary: false }
                            : existingCalendar
                    );
                }

                state.calendars.push({
                    id: calendar.id,
                    title: calendar.title,
                    color: calendar.color ?? "#FF8C00",
                    source: "local",
                    primary: calendar.primary,
                    readOnly: false,
                });
                if (!state.filters.showCalendars.includes(calendar.id)) {
                    state.filters.showCalendars.push(calendar.id);
                }
            })
        );
        persistFilters();
        await savePrefs();
        return calendar;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error creating calendar:", error);
        Toast.warn("Failed to create calendar.");
        return null;
    }
};

const updateLocalCalendar = async (
    id: string,
    data: Partial<Pick<ICalendar, "title" | "color" | "primary">>
) => {
    try {
        const calendar = await CalendarsAPI.update(id, data);
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                if (calendar.primary) {
                    state.calendars = state.calendars.map(c =>
                        c.source === "local"
                            ? {
                                  ...c,
                                  ...(c.id === id
                                      ? {
                                            title: calendar.title,
                                            color: calendar.color ?? c.color,
                                        }
                                      : {}),
                                  primary: c.id === id,
                              }
                            : c
                    );
                    return;
                }

                const idx = state.calendars.findIndex(c => c.id === id && c.source === "local");
                if (idx !== -1) {
                    state.calendars[idx] = {
                        ...state.calendars[idx],
                        title: calendar.title,
                        color: calendar.color ?? state.calendars[idx].color,
                        primary: calendar.primary,
                    };
                }
            })
        );
        return calendar;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error updating calendar:", error);
        Toast.warn("Failed to update calendar.");
        return null;
    }
};

const deleteLocalCalendar = async (id: string) => {
    try {
        const { success } = await CalendarsAPI.remove(id);
        if (success) {
            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.calendars = state.calendars.filter(c => c.id !== id);
                    state.filters.showCalendars = state.filters.showCalendars.filter(
                        calendarId => calendarId !== id
                    );
                    state.events = state.events.filter(event => {
                        if (event.resource.type !== EVENTTYPE.EVENT) return true;

                        const calendarEvent = event.resource.data as ICalendarEvent;
                        return calendarEvent.source !== "local" || calendarEvent.calendar !== id;
                    });
                })
            );
            persistFilters();
        }
        return success;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error deleting calendar:", error);
        Toast.warn("Failed to delete calendar.");
        return false;
    }
};

const setDefaultLocalCalendar = async (id: string) => {
    try {
        const calendar = await CalendarsAPI.update(id, { primary: true });
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                // Update all local calendars
                state.calendars = state.calendars.map(c => {
                    if (c.source === "local") {
                        return { ...c, primary: c.id === id };
                    }
                    return c;
                });
            })
        );
        return calendar;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error setting default calendar:", error);
        Toast.warn("Failed to set default calendar.");
        return null;
    }
};

const moveEvent = async (event: ICalendarEvent, calendar: string, source: ICalendarSource) => {
    if (event.source === source && event.calendar === calendar) return;
    if (event.source !== source) {
        Toast.warn("Events can only move within the same calendar source.");
        return;
    }

    try {
        await EventsAPI.move(event.id, calendar, source);
        if (source === "local") {
            await updateEvent(event.id, { calendar }, true);
            selectEvent(event.id, EVENTTYPE.EVENT);
        } else if (source === "google") {
            const googleEventId = event.id.slice(event.id.lastIndexOf("_") + 1);
            selectEvent(`google_${calendar}_${googleEventId}`, EVENTTYPE.EVENT);
        } else {
            selectEvent(event.id, EVENTTYPE.EVENT);
        }
        await reload();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("moveEvent error:", error);
        Toast.warn("Failed to move event.");
    }
};

const loginGoogle = async () => {
    try {
        // Get the Google OAuth authorization URL
        const { authUrl } = await CalendarIntegrationsAPI.getAuthUrl("google");
        if (!authUrl) {
            Toast.warn("Failed to get Google authorization URL.");
            return;
        }

        // Open popup window for Google OAuth
        const popup = window.open(
            authUrl,
            "google-oauth",
            "width=500,height=600,scrollbars=yes,resizable=yes"
        );

        if (!popup) {
            Toast.warn("Popup blocked. Please allow popups for this site.");
            return;
        }

        // Listen for the popup to close or receive a message
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                // Check if authentication was successful
                checkGoogleAuthStatus();
            }
        }, 1000);

        // Listen for messages from the popup (if callback sends postMessage)
        const messageListener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
                clearInterval(checkClosed);
                popup.close();
                window.removeEventListener("message", messageListener);
                handleGoogleAuthSuccess();
            } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
                clearInterval(checkClosed);
                popup.close();
                window.removeEventListener("message", messageListener);
                Toast.warn("Google authentication failed.");
            }
        };

        window.addEventListener("message", messageListener);

        // Cleanup after 5 minutes
        setTimeout(() => {
            clearInterval(checkClosed);
            window.removeEventListener("message", messageListener);
            if (!popup.closed) {
                popup.close();
            }
        }, 300000);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Google login error:", error);
        Toast.warn("Something went wrong while logging in your Google account.");
    }
};

const checkGoogleAuthStatus = async () => {
    try {
        const status = await CalendarIntegrationsAPI.getStatus("google");
        if (status.isAuthenticated) await handleGoogleAuthSuccess();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to check Google auth status:", error);
    }
};

const hydrateFromBoot = async (integrations?: { google?: { isAuthenticated: boolean } }) => {
    if (!integrations?.google?.isAuthenticated) return;

    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.tokens.google = { authenticated: true };
        })
    );
};

const handleGoogleAuthSuccess = async () => {
    try {
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.tokens.google = { authenticated: true };
            })
        );

        await loadCalendars();

        // if there aren't already google calendars checked in the filters
        // we'll get the primary one or the first one from the list
        const { calendars, filters } = CalendarStore.get();
        const googleCalendars = calendars.filter(calendar => calendar.source === "google");
        if (!googleCalendars.some(calendar => filters.showCalendars.includes(`google-${calendar.id}`))) {
            const primaryCalendar =
                googleCalendars.find(calendar => calendar.primary) ?? googleCalendars.at(0);
            if (primaryCalendar != null) {
                CalendarStore.set(
                    produce((state: ICalendarStore) => {
                        state.filters.showCalendars.push(`google-${primaryCalendar.id}`);
                    })
                );
                persistFilters();
                await savePrefs();
            }
        }

        // loading google events
        await load();

        Toast.success("Successfully connected to Google Calendar!");
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error handling Google auth success:", error);
        Toast.warn("Failed to load Google Calendar data.");
    }
};

const disconnectCalendarProvider = async (provider: CalendarProvider) => {
    try {
        if (provider === "google") {
            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.tokens.google = null;
                    state.calendars = state.calendars.filter(calendar => calendar.source !== "google");
                    state.filters.showCalendars = state.filters.showCalendars.filter(
                        calendarId => !calendarId.startsWith("google-")
                    );
                })
            );
            persistFilters();
        }

        await CalendarIntegrationsAPI.disconnect(provider);
        await load(); // Reload events without Google events
        Toast.success(
            provider === "google"
                ? "Successfully disconnected from Google Calendar."
                : "Successfully disconnected."
        );
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Calendar provider disconnect error:", error);
        Toast.warn(
            provider === "google" ? "Failed to disconnect from Google Calendar." : "Failed to disconnect."
        );
    }
};

const logoutGoogle = async () => {
    await disconnectCalendarProvider("google");
};

export const CalendarActions = {
    load,
    reload,
    setView,
    setDate,
    setToday,
    goPrev,
    goNext,
    changeEvent,
    onTaskDrop,
    toggleFilters,
    updateEvent,
    deleteEvent,
    deleteEventAlert,
    deleteSelectedEvent,
    addTempEvent,
    setNewEvent,
    selectEvent,
    unselectEvent,
    clearSelectedEvent,
    setFilter,
    loadCalendars,
    toggleCalendar,
    moveEvent,
    loginGoogle,
    logoutGoogle,
    disconnectCalendarProvider,
    hydrateFromBoot,
    createLocalCalendar,
    updateLocalCalendar,
    deleteLocalCalendar,
    setDefaultLocalCalendar,
};
