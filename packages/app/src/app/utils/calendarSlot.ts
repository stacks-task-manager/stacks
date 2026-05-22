// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { DateSelectArg } from "@fullcalendar/core";

/**
 * Shape previously taken from react-big-calendar `SlotInfo`; used by calendar slot menus.
 */
export interface CalendarSlotInfo {
    start: Date;
    end: Date;
    slots: Date[];
    action: "select" | "click" | "doubleClick";
    allDay?: boolean;
    bounds?: { x: number; y: number; top: number; bottom: number; left: number; right: number };
    box?: { x: number; y: number; clientX: number; clientY: number };
}

export function dateSelectArgToSlotInfo(arg: DateSelectArg): CalendarSlotInfo {
    const start = arg.start;
    const end = arg.end ?? arg.start;
    const slots = start.getTime() === end.getTime() ? [start] : [start, end];
    return {
        start,
        end,
        slots,
        action: "select",
        allDay: arg.allDay,
        bounds: undefined,
        box: undefined,
    };
}
