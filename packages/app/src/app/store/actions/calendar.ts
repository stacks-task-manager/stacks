// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar data loading and mutations.
 */
import api, { CalendarIntegrationsAPI, type CalendarProvider, EventsAPI } from "app/api";
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
    subWeeks
} from "date-fns";
import { produce } from "immer";
import { xor } from "lodash";

import { EVENTTYPE, ICalendarEvent, ICalendarSource, IEvent, ITask } from "@stacks/types";
import { getDatesSpan } from "app/hooks";
import Dialog from "app/utils/dialog";
import Toast from "app/utils/toast";
import Storage from "app/utils/storage";
import { patchFilterField } from "../actionHelpers";
import { CALENDAR_FILTERS_STORAGE_KEY, CalendarStore, ICalendarFilters, ICalendarStore } from "../calendar";
import { TasksActions } from "./tasks";

const savePrefs = async () => {
    const { filters } = CalendarStore.get();
    await api("events/savePrefs", { filters });
};

const persistFilters = () => {
    Storage.set(CALENDAR_FILTERS_STORAGE_KEY, CalendarStore.get().filters);
};

let loadingCalendar = false;
let pendingCalendarLoad = false;
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
                        if (calendarId.startsWith("google-")) return `google:${calendarId.slice("google-".length)}`;
                        return null;
                    })
                    .filter((v): v is string => typeof v === "string" && v.length > 0)
            )
        );
        const calEvents = await EventsAPI.loadEvents(from, to, calendars.length ? calendars : undefined);

        for (const event of calEvents) {
            const startDate = event.start;
            const endDate = event.end;

            const start = event.allDay ? setHours(startDate, 0) : startDate;
            const end = event.allDay ? setHours(endDate, 23) : endDate;

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
    const { tokens } = CalendarStore.get();

    if (tokens.google != null) {
        await loadCalendars();
    }
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

const changeEvent = (
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
        // console.log("TASK", task);

        let startDate: Date | undefined = undefined;
        let dueDate: Date | undefined = undefined;

        // if task had both dates
        if (task.startdate && task.duedate) {
            // console.log("A");

            startDate = task.startdate || resize ? (changedEvent.start as Date) : undefined;
            dueDate = task.duedate || resize ? (changedEvent.end as Date) : undefined;

            if (startDate) {
                startDate.allDay = allDay;
            }
            if (dueDate) {
                dueDate.allDay = allDay;
            }

            if (allDay && startDate && dueDate && isSameDay(startDate, dueDate)) {
                startDate = undefined;
            }
        }

        // if task had only start date
        else if (task.startdate && !task.duedate) {
            // console.log("B");
            startDate = changedEvent.start as Date;

            if (changedEvent.isAllDay) {
                startDate = setHours(changedEvent.start as Date, 12);
            }

            startDate.allDay = changedEvent.isAllDay;
        }
        // if task had only due date
        else if (!task.startdate && task.duedate) {
            // console.log("C");
            dueDate = changedEvent.end as Date;

            if (changedEvent.isAllDay) {
                dueDate = setHours(changedEvent.end as Date, 12);
            }

            dueDate.allDay = changedEvent.isAllDay;

            startDate = changedEvent.start as Date;
            startDate.allDay = allDay;

            if (dueDate && startDate && isSameDay(dueDate, startDate) && allDay) {
                startDate = undefined;
            }
        }

        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.events = state.events.map((event: IEvent) => {
                    if (event.resource.data.id === actualEvent.resource.data.id) {
                        if (startDate != null) {
                            if (allDay) {
                                startDate = setMinutes(setHours(startDate, 12), 0);
                            }
                        } else {
                            startDate = dueDate;
                            if (allDay && dueDate) {
                                startDate = setMinutes(setHours(dueDate, 12), 0);
                            }
                        }

                        if (startDate) {
                            startDate.allDay = allDay;
                        }

                        if (dueDate != null) {
                            if (allDay) {
                                dueDate = setMinutes(setHours(dueDate, 12), 30);
                            }
                        } else {
                            dueDate = startDate;
                            if (allDay && startDate) {
                                dueDate = setMinutes(setHours(startDate, 12), 30);
                            }
                        }

                        if (dueDate) {
                            dueDate.allDay = allDay;
                        }

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

        TasksActions.update(actualEvent.resource.data.id, {
            startdate: startDate,
            duedate: dueDate,
        });
    }
    // update an event
    else if (actualEvent.resource.type === EVENTTYPE.EVENT) {
        const allDay = changedEvent.isAllDay ?? changedEvent.event.allDay;
        const calEvent = changedEvent.event.resource.data as ICalendarEvent;

        updateEvent(calEvent.id, {
            ...calEvent,
            start: format(changedEvent.start as Date, `yyyy-MM-dd${allDay ? "" : " HH:mm"}`) as unknown as Date,
            end: format(changedEvent.end as Date, `yyyy-MM-dd${allDay ? "" : " HH:mm"}`) as unknown as Date,
            allDay,
        });
    }
};

const onTaskDrop = (task: ITask, start: Date, allDay: boolean, end?: Date) => {
    const { view } = CalendarStore.get();

    const updatedTask: Partial<ITask> = {};

    const event: IEvent = {
        title: task.title,
        allDay,
        resource: {
            data: { ...task, ...updatedTask },
            type: EVENTTYPE.TASK,
        },
    };

    if (view === "month" || (end && format(start, "HH:mm") === format(end, "HH:mm"))) {
        const dueDate = start;
        dueDate.allDay = true;
        updatedTask.duedate = dueDate;
        (event.resource.data as ITask).duedate = updatedTask.duedate;
        event.start = start;
        event.end = end ? endOfDay(end) : addHours(start, 1);
        event.allDay = true;
    } else {
        const startDate = start;
        const endDate = addHours(startDate, 1);
        if (!allDay) {
            startDate.allDay = false;
            endDate.allDay = false;
        }
        updatedTask.startdate = startDate;
        updatedTask.duedate = endDate;

        (event.resource.data as ITask).startdate = updatedTask.startdate;
        (event.resource.data as ITask).duedate = updatedTask.duedate;

        event.start = start;
        event.end = end ?? addHours(startDate, 1);
        event.allDay = false;
    }

    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.events.push(event);
        })
    );

    api("tasks/update", task.id, updatedTask);
};

const toggleFilters = () => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.showFilters = !state.showFilters;
            state.selected = undefined;
        })
    );
};

let updateDebounce: NodeJS.Timeout | null = null;
const updateEvent = async (eventId: string, updatedEvent: Partial<ICalendarEvent>, skipSave = false) => {
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
                        let startDate = new Date(updatedEvent.start);
                        if (event.allDay) {
                            startDate = setHours(startDate, 0);
                        }
                        event.start = startDate;
                    }

                    if (updatedEvent.end != null) {
                        let endDate = new Date(updatedEvent.end);
                        if (event.allDay) {
                            endDate = setHours(endDate, 23);
                        }
                        event.end = endDate;
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

    if (updateDebounce) {
        clearTimeout(updateDebounce);
        updateDebounce = null;
    }

    updateDebounce = setTimeout(async () => {
        const { start, end, ...rest } = updatedEvent;
        const startChanged = start != null;
        const endChanged = end != null;

        const payload: Partial<ICalendarEvent> = { ...rest };

        if (startChanged || endChanged) {
            const current = CalendarStore.get().events.find(e => e.resource.data.id === eventId);
            const currentStart = current?.start;
            const currentEnd = current?.end;

            const startToSend = startChanged ? new Date(start as any) : currentStart ? new Date(currentStart) : undefined;
            let endToSend = endChanged ? new Date(end as any) : currentEnd ? new Date(currentEnd) : undefined;

            if (startToSend && endToSend && endToSend <= startToSend) {
                endToSend = addHours(startToSend, 1);
            }

            if (startToSend) payload.start = startToSend;
            if (endToSend) payload.end = endToSend;
        }

        await EventsAPI.update(eventId, payload);
    }, 500);
};

const addEvent = async (event: Omit<ICalendarEvent, "id">) => {
    const savedEvent: ICalendarEvent | false = await EventsAPI.add(event);

    if (savedEvent) {
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                let start = savedEvent.start;
                let end = savedEvent.end;

                if (event.allDay) {
                    start = setHours(start, 0);
                    end = setHours(end, 23);
                }

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

                state.events.push(calEvent);
            })
        );
    }

    return savedEvent;
};

const addTempEvent = async (startDate: Date, endDate: Date) => {
    const { view } = CalendarStore.get();
    const allDay = view === "month" ? true : false;

    const start = startDate;
    let end = endDate;

    if (view === "month") {
        end = subDays(end, 1);
    }

    const newEvent: ICalendarEvent | false = await addEvent({
        title: "New event",
        description: "",
        start: startOfDay(start),
        end: endOfDay(end),
        allDay,
        assignees: [],
        source: "local",
        calendar: "local",
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
    const deleted: boolean = await EventsAPI.remove(eventId);

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
    await savePrefs();
};

const toggleCalendar = async (calendarId: string) => {
    CalendarStore.set(
        produce((state: ICalendarStore) => {
            state.filters.showCalendars = xor(state.filters.showCalendars, [calendarId]);
        })
    );

    persistFilters();
    await savePrefs();
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
    if (CalendarStore.get().tokens.google == null) return;
    if (loadCalendarsPromise) return loadCalendarsPromise;

    const promise = (async () => {
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.loadingCalendars = true;
            })
        );

        try {
            const calendars = await CalendarIntegrationsAPI.listCalendars("google");

            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.calendars = [
                        ...state.calendars.filter(calendar => calendar.source !== "google"),
                        ...calendars,
                    ];
                    state.loadingCalendars = false;
                })
            );
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error loading Google calendars:", error);
            CalendarStore.set(
                produce((state: ICalendarStore) => {
                    state.loadingCalendars = false;
                })
            );
            Toast.warn("Failed to load Google calendars.");
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

const moveEvent = async (event: ICalendarEvent, calendar: string, source: ICalendarSource) => {
    if (event.source === source && event.calendar === calendar) return;

    try {
        const savedEvent = await addEvent({
            title: event.title,
            description: event.description,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            assignees: event.assignees,
            ...(event.location ? { location: event.location } : {}),
            source,
            calendar,
        });

        if (!savedEvent) {
            Toast.warn("Failed to move event.");
            return;
        }

        await deleteEvent(event.id);
        selectEvent(savedEvent.id, EVENTTYPE.EVENT);
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

    await loadCalendars();
};

const handleGoogleAuthSuccess = async () => {
    try {
        CalendarStore.set(
            produce((state: ICalendarStore) => {
                state.tokens.google = { authenticated: true };
            })
        );

        // fetching calendar lists from google
        await loadCalendars();

        // if there aren't already google calendars checked in the filters
        // we'll get the primary one or the first one from the list
        const { calendars, filters } = CalendarStore.get();
        if (!calendars.some(calendar => filters.showCalendars.includes(`google-${calendar.id}`))) {
            const primaryCalendar = calendars.find(calendar => calendar.primary) ?? calendars.at(0);
            if (primaryCalendar != null) {
                CalendarStore.set(
                    produce((state: ICalendarStore) => {
                        state.filters.showCalendars.push(`google-${primaryCalendar.id}`);
                    })
                );
                persistFilters();
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
                })
            );
        }

        await CalendarIntegrationsAPI.disconnect(provider);
        await load(); // Reload events without Google events
        Toast.success(
            provider === "google" ? "Successfully disconnected from Google Calendar." : "Successfully disconnected."
        );
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Calendar provider disconnect error:", error);
        Toast.warn(provider === "google" ? "Failed to disconnect from Google Calendar." : "Failed to disconnect.");
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
};
