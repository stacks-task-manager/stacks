// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Intent, Menu, MenuDivider, MenuItem, Portal } from "@blueprintjs/core";
import { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { EventResizeDoneArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { translate } from "@stacks/translations";
import { APPICONS, EVENTTYPE, ICalendarEvent, IEvent, IPerson, ITask } from "@stacks/types";
import classNames from "classnames";
import mousetrap from "mousetrap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "app/components/common";
import { getDocument, useEvents, usePreferences, useRealtimeUpdates } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { CalendarActions } from "app/store/actions";
import { CalendarStore, ICalendarRemote } from "app/store/calendar";
import { toggleSidebar } from "app/store/global";
import { mapCalendarStoreViewToFc } from "app/utils/calendarFullCalendar";
import { CalendarSlotInfo, dateSelectArgToSlotInfo } from "app/utils/calendarSlot";
import {
    AppView,
    AppViewContent,
    Calendar2,
    CalendarEventDetails,
    CalendarFilters,
    ToolbarCalendar,
} from "app/widgets";
import { CalendarTasksMenu } from "app/widgets/calendar/CalendarTasksMenu/CalendarTasksMenu";

function isCalendarEventEditable(ev: IEvent): boolean {
    return ev.resource.type !== EVENTTYPE.BIRTHDAY && ev.resource.type !== EVENTTYPE.TIMELOG;
}

function getCalendarEventTitle(ev: IEvent): string {
    if (typeof ev.title === "string" && ev.title.length > 0) {
        return ev.title;
    }
    if (ev.resource.type === EVENTTYPE.TASK) {
        return (ev.resource.data as ITask).title || "";
    }
    if (ev.resource.type === EVENTTYPE.EVENT) {
        return (ev.resource.data as ICalendarEvent).title || "";
    }
    if (ev.resource.type === EVENTTYPE.BIRTHDAY) {
        const p = ev.resource.data as IPerson;
        return [p.firstName, p.lastName].filter(Boolean).join(" ") || "Birthday";
    }
    return "";
}

function eventTintForFullCalendar(ev: IEvent, calendars: ICalendarRemote[]): string | undefined {
    if (ev.resource.type === EVENTTYPE.TASK || ev.resource.type === EVENTTYPE.TIMELOG) {
        const task = ev.resource.data as ITask;
        const document = getDocument(task.project);
        const projectTint = document?.data as { tint?: string } | undefined;
        if (projectTint?.tint) {
            return projectTint.tint;
        }
        return task.project === "inbox" ? "#f5a623" : "#4C942F";
    }
    if (ev.resource.type === EVENTTYPE.EVENT) {
        const calEvent = ev.resource.data as ICalendarEvent;
        if (calEvent.source === "google") {
            const calendar = calendars.find(c => c.id === calEvent.calendar);
            if (calendar?.color) {
                return calendar.color;
            }
        }
        if (calEvent.color) {
            return calEvent.color;
        }
        return "#006CC0";
    }
    if (ev.resource.type === EVENTTYPE.BIRTHDAY) {
        return "#954F94";
    }
    return undefined;
}

function toChangePayload(arg: EventDropArg | EventResizeDoneArg) {
    const iEvent = arg.event.extendedProps?.iEvent as IEvent | undefined;
    const start = arg.event.start;
    const end = arg.event.end;
    if (!iEvent || !start || !end) {
        return null;
    }
    return {
        event: iEvent,
        start,
        end,
        isAllDay: arg.event.allDay,
    };
}

export const Calendar = () => {
    const { calendarShowAllEvents } = usePreferences(["calendarShowAllEvents"]);
    const { view, date, calendars, showCalendars, tokens } = CalendarStore.use(
        state => ({
            view: state.view,
            date: state.date,
            calendars: state.calendars,
            showCalendars: state.filters.showCalendars,
            tokens: state.tokens,
        }),
        shallowEqual
    );
    const events = useEvents();

    const [bounds, setBounds] = useState<null | [number, number]>(null);
    const [selectedSlot, setSelectedSlot] = useState<CalendarSlotInfo | null>(null);
    const [showTasksPicker, setShowTasksPicker] = useState(false);

    const previousDate = useRef<Date | null>(null);
    const previousView = useRef<string | null>(null);
    const previousShowCalendars = useRef<string | null>(null);
    const calendarRef = useRef<FullCalendar>(null);
    const lastAutoReloadAtRef = useRef<number>(0);

    useRealtimeUpdates("events", CalendarActions.reload);

    useEffect(() => {
        const showCalendarsKey = JSON.stringify(showCalendars);
        if (
            previousDate.current === date &&
            previousView.current === view &&
            previousShowCalendars.current === showCalendarsKey
        ) {
            return;
        }

        CalendarActions.load();
        previousDate.current = date;
        previousView.current = view;
        previousShowCalendars.current = showCalendarsKey;
    }, [date, view, showCalendars]);

    useEffect(() => {
        const shouldAutoReload =
            tokens.google != null && showCalendars.some(calendarId => calendarId.startsWith("google-"));
        if (!shouldAutoReload) return;

        const triggerAutoReload = () => {
            const now = Date.now();
            if (document.visibilityState !== "visible") return;
            if (now - lastAutoReloadAtRef.current < 15_000) return;
            lastAutoReloadAtRef.current = now;
            void CalendarActions.reload();
        };

        const intervalId = window.setInterval(triggerAutoReload, 120_000);
        window.addEventListener("focus", triggerAutoReload);
        document.addEventListener("visibilitychange", triggerAutoReload);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", triggerAutoReload);
            document.removeEventListener("visibilitychange", triggerAutoReload);
        };
    }, [showCalendars, tokens.google]);

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            const api = calendarRef.current?.getApi();
            if (!api) {
                return;
            }
            api.changeView(mapCalendarStoreViewToFc(view));
            api.gotoDate(date);
        });
        return () => cancelAnimationFrame(id);
    }, [view, date]);

    useEffect(() => {
        mousetrap.bind("left", CalendarActions.goPrev);
        mousetrap.bind("right", CalendarActions.goNext);

        mousetrap.bind("meta+1", () => CalendarActions.setView("day"));
        mousetrap.bind("meta+2", () => CalendarActions.setView("week"));
        mousetrap.bind("meta+3", () => CalendarActions.setView("month"));
        mousetrap.bind("meta+t", CalendarActions.setToday);
        mousetrap.bind("down", CalendarActions.setToday);
        mousetrap.bind("meta+u", () => toggleSidebar());

        return () => {
            mousetrap.unbind("right");
            mousetrap.unbind("left");
            mousetrap.unbind("meta+1");
            mousetrap.unbind("meta+2");
            mousetrap.unbind("meta+3");
            mousetrap.unbind("meta+t");
            mousetrap.unbind("down");
            mousetrap.unbind("meta+u");
        };
    }, []);

    const fcEvents = useMemo(() => {
        return events.map(ev => {
            const data = ev.resource.data as { id: string };
            const id = String(data.id);
            return {
                id,
                title: getCalendarEventTitle(ev),
                start: ev.start!,
                end: ev.end!,
                allDay: Boolean(ev.allDay),
                editable: isCalendarEventEditable(ev),
                extendedProps: {
                    iEvent: ev,
                    tint: eventTintForFullCalendar(ev, calendars),
                },
            };
        });
    }, [events, calendars]);

    const handleSlotSelect = useCallback((arg: DateSelectArg) => {
        setSelectedSlot(dateSelectArgToSlotInfo(arg));
        setShowTasksPicker(false);
        const e = arg.jsEvent;
        if (e && "pageX" in e) {
            const me = e as MouseEvent;
            const top = Math.min(me.pageY, window.innerHeight - 120);
            const left = Math.min(me.pageX, window.innerWidth - 200);
            setBounds([top, left]);
        } else {
            setBounds([120, 120]);
        }
    }, []);

    const handleEventClick = useCallback((arg: EventClickArg) => {
        const iEvent = arg.event.extendedProps?.iEvent as IEvent | undefined;
        const type = iEvent?.resource?.type;
        const id = iEvent?.resource?.data?.id;
        if (id && type != null) {
            CalendarActions.selectEvent(String(id), type as EVENTTYPE);
        }
    }, []);

    const handleEventDrop = useCallback((arg: EventDropArg) => {
        const p = toChangePayload(arg);
        if (p) {
            CalendarActions.changeEvent(false, p);
        }
    }, []);

    const handleEventResize = useCallback((arg: EventResizeDoneArg) => {
        const p = toChangePayload(arg);
        if (p) {
            CalendarActions.changeEvent(true, p);
        }
    }, []);

    const cancelSlotSelection = () => {
        setSelectedSlot(null);
        setBounds(null);
    };

    const handleResetSlot = () => {
        setSelectedSlot(null);
    };

    return (
        <AppView
            toolbar={<ToolbarCalendar />}
            append={
                <>
                    <CalendarFilters />
                    <CalendarEventDetails />

                    {selectedSlot != null && bounds != null ? (
                        <Portal>
                            <div
                                style={{
                                    position: "fixed",
                                    top: bounds.at(0),
                                    left: bounds.at(1),
                                    zIndex: 10,
                                }}
                                className={classNames([Classes.POPOVER])}
                            >
                                <div className={Classes.POPOVER_CONTENT}>
                                    {showTasksPicker ? (
                                        <CalendarTasksMenu
                                            slot={selectedSlot}
                                            onCancel={handleHideTasksPicker}
                                        />
                                    ) : null}

                                    {!showTasksPicker ? (
                                        <Menu>
                                            <MenuItem
                                                text={`${translate("Add event")}...`}
                                                icon={<Icon icon={APPICONS.CALENDAREVENTADD} />}
                                                intent={Intent.SUCCESS}
                                                onClick={handleShowQuickEvent}
                                            />
                                            <MenuItem
                                                text={`${translate("Add task")}...`}
                                                icon={<Icon icon={APPICONS.TASK} />}
                                                intent={Intent.PRIMARY}
                                                onClick={handleShowTasksPicker}
                                            />
                                            <MenuDivider />
                                            <MenuItem
                                                text={translate("Cancel")}
                                                icon={<Icon icon={APPICONS.CLOSE} />}
                                                intent={Intent.WARNING}
                                                onClick={cancelSlotSelection}
                                            />
                                        </Menu>
                                    ) : null}
                                </div>
                            </div>
                        </Portal>
                    ) : null}
                </>
            }
        >
            <AppViewContent padded onMouseDown={handleResetSlot}>
                <Calendar2
                    ref={calendarRef}
                    initialDate={date}
                    initialView={mapCalendarStoreViewToFc(view)}
                    events={fcEvents}
                    showCurrentTime
                    dayMaxEvents={calendarShowAllEvents ? false : true}
                    onSlotSelect={handleSlotSelect}
                    onEventClick={handleEventClick}
                    onEventDrop={handleEventDrop}
                    onEventResize={handleEventResize}
                />
            </AppViewContent>
        </AppView>
    );

    function handleShowQuickEvent() {
        if (CalendarStore.get().selected) {
            CalendarActions.clearSelectedEvent();
        }

        const b = bounds;
        if (b && selectedSlot) {
            const [top, left] = b;
            const height = 210;
            const width = 300;
            setBounds([
                top + height > window.innerHeight ? window.innerHeight - height : top,
                left + width > window.innerWidth ? window.innerWidth - width : left,
            ]);
        }

        if (selectedSlot) {
            CalendarActions.addTempEvent(selectedSlot.start, selectedSlot.end);
            cancelSlotSelection();
        }
    }

    function handleShowTasksPicker() {
        if (CalendarStore.get().selected) {
            CalendarActions.clearSelectedEvent();
        }

        const b = bounds;
        if (b) {
            const [top, left] = b;
            const height = 400;
            const width = 310;
            setBounds([
                top + height > window.innerHeight ? window.innerHeight - height : top,
                left + width > window.innerWidth ? window.innerWidth - width : left,
            ]);
        }
        setShowTasksPicker(true);
    }

    function handleHideTasksPicker() {
        setBounds(null);
        setShowTasksPicker(false);
    }
};
