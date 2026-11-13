// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    addDays,
    addMonths,
    differenceInCalendarDays,
    endOfDay,
    format,
    isWeekend,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from "date-fns";
import { DateEdit, DateRange, GanttRow, GanttScale } from "app/components/common/GanttChart/types";

export const ROW_HEIGHT = 48;
export const HEADER_HEIGHT = 56;
export const MIN_PANE_WIDTH = 120;
export const pixelsPerDay: Record<GanttScale, number> = {
    day: 36,
    week: 14,
    month: 4,
    quarter: 1.5,
    halfYear: 0.75,
};

export function clampPaneWidth(width: number, availableWidth: number): number {
    const max = Math.max(MIN_PANE_WIDTH, availableWidth - MIN_PANE_WIDTH);
    return Math.round(Math.max(MIN_PANE_WIDTH, Math.min(max, width)));
}

export function dateAt(origin: Date, x: number, unit: number): Date {
    return addDays(startOfDay(origin), Math.floor(x / unit));
}

export function barGeometry(origin: Date, start: Date, end: Date, unit: number) {
    return {
        left: differenceInCalendarDays(start, origin) * unit,
        width: Math.max(1, differenceInCalendarDays(end, start) + 1) * unit,
    };
}

export function editDates(start: Date, end: Date, kind: DateEdit, days: number): DateRange {
    if (kind === "move") return { startDate: addDays(start, days), endDate: endOfDay(addDays(end, days)) };
    if (kind === "left")
        return {
            startDate: addDays(start, Math.min(days, differenceInCalendarDays(end, start))),
            endDate: end,
        };
    return {
        startDate: start,
        endDate: endOfDay(addDays(end, Math.max(days, -differenceInCalendarDays(end, start)))),
    };
}

export function flattenRows(rows: GanttRow[], collapsed: ReadonlySet<string>) {
    const result: {
        row: GanttRow;
        depth: number;
        guides: number[];
        hasNextSibling: boolean;
    }[] = [];
    const visit = (items: GanttRow[], depth: number, guides: number[]) => {
        for (const [index, row] of items.entries()) {
            const hasNextSibling = index < items.length - 1;
            result.push({ row, depth, guides, hasNextSibling });
            if (!collapsed.has(row.id)) {
                const childGuides = hasNextSibling && depth > 0 ? [...guides, depth] : guides;
                visit(row.children, depth + 1, childGuides);
            }
        }
    };
    visit(rows, 0, []);
    return result;
}

export function visibleWindow(scrollTop: number, height: number, count: number) {
    return {
        start: Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5),
        end: Math.min(count, Math.ceil((scrollTop + height) / ROW_HEIGHT) + 5),
    };
}

export interface TimelineTick {
    date: Date;
    left: number;
    width: number;
    label: string;
    major: string;
    weekend: boolean;
}

export function timelineTicks(origin: Date, left: number, width: number, scale: GanttScale): TimelineTick[] {
    const unit = pixelsPerDay[scale];
    const first = dateAt(origin, left, unit);
    let cursor =
        scale === "day"
            ? first
            : scale === "week"
              ? startOfWeek(first, { weekStartsOn: 1 })
              : startOfMonth(first);
    if (scale === "quarter")
        cursor = new Date(cursor.getFullYear(), Math.floor(cursor.getMonth() / 3) * 3, 1);
    if (scale === "halfYear")
        cursor = new Date(cursor.getFullYear(), Math.floor(cursor.getMonth() / 6) * 6, 1);
    const ticks: TimelineTick[] = [];
    while (differenceInCalendarDays(cursor, origin) * unit < left + width) {
        const next =
            scale === "day"
                ? addDays(cursor, 1)
                : scale === "week"
                  ? addDays(cursor, 7)
                  : addMonths(cursor, scale === "month" ? 1 : scale === "quarter" ? 3 : 6);
        ticks.push({
            date: cursor,
            left: differenceInCalendarDays(cursor, origin) * unit,
            width: differenceInCalendarDays(next, cursor) * unit,
            label:
                scale === "day"
                    ? format(cursor, "d")
                    : scale === "week"
                      ? format(cursor, "dd MMM")
                      : scale === "month"
                        ? format(cursor, "MMM")
                        : scale === "quarter"
                          ? format(cursor, "'Q'Q")
                          : format(cursor, "MMM"),
            major: scale === "day" || scale === "week" ? format(cursor, "MMMM yyyy") : format(cursor, "yyyy"),
            weekend: scale === "day" && isWeekend(cursor),
        });
        cursor = next;
    }
    return ticks;
}
