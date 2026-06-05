// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors, Popover } from "@blueprintjs/core";
import { DateInput, DateSelectArg, DatesSetArg, EventClickArg, EventDropArg, EventSourceInput } from "@fullcalendar/core";
import { EventImpl } from "@fullcalendar/core/internal";
import interactionPlugin, { EventResizeDoneArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Icon } from "app/components/common";
import { adjustColor, colorToHuedColor } from "app/utils/colors";
import classNames from "classnames";
import { addMinutes, format } from "date-fns";
import { formatFullCalendarNowIndicatorTime, formatFullCalendarSlotTime } from "app/utils/date";
import React, { CSSProperties, forwardRef, useMemo, useState } from "react";

export type calendarViewType = "one" | "three" | "weekdays" | "week" | "month";

interface CalendarProps {
    initialDate?: DateInput;
    showWeekends?: boolean;
    events?: EventSourceInput;
    canSelectEvent?: boolean;
    showCurrentTime?: boolean;
    showAllDaySlot?: boolean;
    /** When false, month view shows every event; when true, uses FullCalendar “+more” behavior. */
    dayMaxEvents?: number | boolean;
    initialView?: calendarViewType;
    onEventClick?: (event: EventClickArg) => void; // event was clicked / selected
    onEventChange?: (arg: EventDropArg | EventResizeDoneArg) => void; // event updated, moved or resized
    onEventDrop?: (arg: EventDropArg) => void;
    onEventResize?: (arg: EventResizeDoneArg) => void;
    onSlotSelect?: (arg: DateSelectArg) => void; // empty slot was selected
    onDatesChanged?: (arg: DatesSetArg) => void; // dates changed
}

export const Calendar2 = forwardRef<FullCalendar, CalendarProps>((props, ref) => {
    return (
        <div className="calendar2">
            <FullCalendar
                ref={ref}
                plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView={props.initialView}
                initialDate={props.initialDate}
                weekends={props.showWeekends}
                views={{
                    one: {
                        type: 'timeGridWeek',
                        duration: { days: 1 },
                        buttonText: '1 Day'
                    },
                    three: {
                        type: 'timeGridWeek',
                        duration: { days: 3 },
                        buttonText: '3 Days'
                    },
                    weekdays: {
                        type: 'timeGridWeek',
                        buttonText: 'Weekdays',
                        weekends: false
                    },
                    week: {
                        type: 'timeGridWeek',
                        buttonText: 'Week'
                    },
                    month: {
                        type: 'dayGridMonth',
                        buttonText: 'Month'
                    },
                }}
                editable={true}
                eventDurationEditable={Boolean(props.onEventChange || props.onEventResize)}
                // eventResizableFromStart={true}  // Resize from top
                slotDuration={{ hours: 0, minutes: 15 }}
                slotLabelInterval={{ hours: 1 }}
                nowIndicator={props.showCurrentTime}
                // eventOverlap={false}
                events={props.events}
                eventClick={props.onEventClick}
                allDaySlot={props.showAllDaySlot === true}

                selectable={true} // whether empty space can be selected
                // selectMirror={true}
                select={props.onSlotSelect}
                // dateClick={console.log}

                eventContent={({ event, view }) => <EventContent event={event} view={view.type as calendarViewType} />}
                dayHeaderContent={({ date }) => {
                    return (
                        <div className="day-header">
                            <div className="day-name">{format(date, "EEE")}</div>
                            <div className="day-number">{format(date, "d")}</div>
                        </div>
                    );
                }}
                slotLabelContent={({ date }) => {
                    return (
                        <div className="slot-time-label">
                            {formatFullCalendarSlotTime(date)}
                        </div>
                    );
                }}
                nowIndicatorContent={({ date }) => {
                    return (
                        <div className="fc-timegrid-now-currentTime">
                            {formatFullCalendarNowIndicatorTime(date)}
                        </div>
                    );
                }}
                headerToolbar={false}

                dayMaxEvents={props.dayMaxEvents ?? true}
                eventDrop={props.onEventDrop ?? props.onEventChange}
                eventResize={props.onEventResize ?? props.onEventChange}

                datesSet={props.onDatesChanged} // the dates changed either via the calendar api (next/prev) or calendar toolbar
            // contentHeight="auto"
            // height="auto"
            />
        </div>
    )
});

Calendar2.displayName = "Calendar2";

const DEFAULT_BG_TOP = "#edf2fb";
const DEFAULT_BG_BOTTOM = "#eef2fcff";

const EventContent = ({ event, view }: { event: EventImpl, view: calendarViewType }) => {
    const [selected, setSelected] = useState(false);

    const tinted = Boolean(event.extendedProps?.tint);
    const styles: CSSProperties = {
        color: tinted ? adjustColor(event.extendedProps.tint, -50) : Colors.DARK_GRAY5,
    }

    if (view !== "month") {
        styles.background = `linear-gradient(0deg, ${tinted ? colorToHuedColor(event.extendedProps.tint, 10) : DEFAULT_BG_BOTTOM} 0%, ${tinted ? colorToHuedColor(event.extendedProps.tint, 2) : DEFAULT_BG_TOP} 100%)`;
        styles.borderColor = tinted ? colorToHuedColor(event.extendedProps.tint, 40) : "#abc4ff";
    }
    let rulerColor = event.extendedProps.tint ?? Colors.GRAY2;

    if (selected) {
        styles.background = styles.color;
        styles.color = Colors.WHITE;
        rulerColor = styles.borderColor;
    }

    const eventContent = useMemo(() => {
        if (view === "month") {
            const time = format(event.start!, "p").split(" ");
            return (
                <>
                    <div className="fc-daygrid-event-dot" style={{ borderColor: rulerColor }}></div>
                    <div className="fc-event-time">{`${parseInt(time[0])}${time[1] ? time[1].substring(0, 1) : ""}`.toLowerCase()}</div>
                    <div className="fc-event-title">{event.title}</div>
                </>
            );
        }

        return (
            <>
                <div className="event-title">{event.title}</div>
                {event.start != null && <div className="event-date"><Icon icon="clock" size={12} /> {format(event.start, "p")} - {format(event.end ?? addMinutes(event.start, 30), "p")}</div>}
                <div className="event-border" style={{ backgroundColor: rulerColor }} />
            </>
        );
    }, [event, rulerColor, styles.color, view]);

    return (
        <Popover
            content={event.extendedProps.popoverContent}
            disabled={!event.extendedProps.popoverContent}
            lazy={true}
            placement="right-start"
            popoverClassName="popover-padded-medium"
            {...event.extendedProps.popoverProps}
            onOpening={() => setSelected(true)}
            onClosing={() => setSelected(false)}
            renderTarget={({ isOpen, ref, ...popoverProps }) => (
                <div {...popoverProps} className={classNames("event-content", { selected: isOpen, completed: event.extendedProps?.completed })} ref={ref} style={styles}>
                    {eventContent}
                </div>
            )} />
    );
}